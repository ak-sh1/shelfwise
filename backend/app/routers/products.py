from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_owner
from app.database import get_db
from app.models import MovementType, Product, StockMovement, User
from app.schemas import (
    CsvImportResult,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjustRequest,
)

router = APIRouter(prefix="/products", tags=["products"])


def _product_out(product: Product) -> ProductOut:
    return ProductOut(
        id=product.id,
        sku=product.sku,
        name=product.name,
        description=product.description,
        category=product.category,
        unit_cost=product.unit_cost,
        unit_price=product.unit_price,
        quantity_on_hand=product.quantity_on_hand,
        reorder_level=product.reorder_level,
        is_low_stock=product.quantity_on_hand <= product.reorder_level,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.get("", response_model=list[ProductOut])
def list_products(
    q: str | None = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProductOut]:
    query = db.query(Product).filter(Product.shop_id == user.shop_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
        )
    products = query.order_by(Product.name.asc()).all()
    if low_stock:
        products = [p for p in products if p.quantity_on_hand <= p.reorder_level]
    return [_product_out(p) for p in products]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> ProductOut:
    existing = (
        db.query(Product)
        .filter(Product.shop_id == user.shop_id, Product.sku == body.sku.strip().upper())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(
        shop_id=user.shop_id,
        sku=body.sku.strip().upper(),
        name=body.name.strip(),
        description=body.description,
        category=body.category.strip() or "Uncategorized",
        unit_cost=body.unit_cost,
        unit_price=body.unit_price,
        quantity_on_hand=body.quantity_on_hand,
        reorder_level=body.reorder_level,
    )
    db.add(product)
    db.flush()
    if body.quantity_on_hand:
        db.add(
            StockMovement(
                product_id=product.id,
                movement_type=MovementType.adjust,
                quantity_delta=body.quantity_on_hand,
                note="Initial stock",
                created_by_id=user.id,
            )
        )
    db.commit()
    db.refresh(product)
    return _product_out(product)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProductOut:
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == user.shop_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_out(product)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> ProductOut:
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == user.shop_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(product, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(product)
    return _product_out(product)


@router.post("/{product_id}/adjust", response_model=ProductOut)
def adjust_stock(
    product_id: int,
    body: StockAdjustRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProductOut:
    if body.quantity_delta == 0:
        raise HTTPException(status_code=400, detail="quantity_delta cannot be zero")

    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == user.shop_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_qty = product.quantity_on_hand + body.quantity_delta
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for this adjustment")

    product.quantity_on_hand = new_qty
    db.add(
        StockMovement(
            product_id=product.id,
            movement_type=MovementType.adjust,
            quantity_delta=body.quantity_delta,
            note=body.note or "Manual adjustment",
            created_by_id=user.id,
        )
    )
    db.commit()
    db.refresh(product)
    return _product_out(product)


@router.post("/import-csv", response_model=CsvImportResult)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> CsvImportResult:
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8") from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Empty CSV")

    required = {"sku", "name"}
    fields = {f.strip().lower() for f in reader.fieldnames}
    if not required.issubset(fields):
        raise HTTPException(status_code=400, detail="CSV must include sku and name columns")

    created = 0
    updated = 0
    errors: list[str] = []

    for idx, row in enumerate(reader, start=2):
        normalized = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
        sku = normalized.get("sku", "").upper()
        name = normalized.get("name", "")
        if not sku or not name:
            errors.append(f"Row {idx}: sku and name are required")
            continue
        try:
            unit_cost = Decimal(normalized.get("unit_cost") or "0")
            unit_price = Decimal(normalized.get("unit_price") or "0")
            qty = int(normalized.get("quantity_on_hand") or "0")
            reorder = int(normalized.get("reorder_level") or "5")
        except (InvalidOperation, ValueError):
            errors.append(f"Row {idx}: invalid numeric values")
            continue

        product = (
            db.query(Product)
            .filter(Product.shop_id == user.shop_id, Product.sku == sku)
            .first()
        )
        if product:
            product.name = name
            product.description = normalized.get("description") or product.description
            product.category = normalized.get("category") or product.category
            product.unit_cost = unit_cost
            product.unit_price = unit_price
            product.reorder_level = reorder
            # quantity only set on create to avoid silent stock overwrites
            updated += 1
        else:
            product = Product(
                shop_id=user.shop_id,
                sku=sku,
                name=name,
                description=normalized.get("description") or None,
                category=normalized.get("category") or "Uncategorized",
                unit_cost=unit_cost,
                unit_price=unit_price,
                quantity_on_hand=max(qty, 0),
                reorder_level=max(reorder, 0),
            )
            db.add(product)
            created += 1

    db.commit()
    return CsvImportResult(created=created, updated=updated, errors=errors)

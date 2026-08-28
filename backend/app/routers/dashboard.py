from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Order, OrderLine, OrderStatus, OrderType, Product, User
from app.schemas import DashboardStats, ProductOut

router = APIRouter(tags=["dashboard"])


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


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardStats:
    products = db.query(Product).filter(Product.shop_id == user.shop_id).all()
    product_count = len(products)
    low_stock_count = sum(1 for p in products if p.quantity_on_hand <= p.reorder_level)
    inventory_value = sum(
        (p.unit_cost * p.quantity_on_hand for p in products), Decimal("0")
    ).quantize(Decimal("0.01"))

    open_orders = (
        db.query(func.count(Order.id))
        .filter(Order.shop_id == user.shop_id, Order.status == OrderStatus.draft)
        .scalar()
        or 0
    )

    now = datetime.now(timezone.utc)
    sales = (
        db.query(func.coalesce(func.sum(OrderLine.unit_price * OrderLine.quantity), 0))
        .join(Order)
        .filter(
            Order.shop_id == user.shop_id,
            Order.order_type == OrderType.sale,
            Order.status == OrderStatus.confirmed,
            extract("year", Order.confirmed_at) == now.year,
            extract("month", Order.confirmed_at) == now.month,
        )
        .scalar()
    )
    purchases = (
        db.query(func.coalesce(func.sum(OrderLine.unit_price * OrderLine.quantity), 0))
        .join(Order)
        .filter(
            Order.shop_id == user.shop_id,
            Order.order_type == OrderType.purchase,
            Order.status == OrderStatus.confirmed,
            extract("year", Order.confirmed_at) == now.year,
            extract("month", Order.confirmed_at) == now.month,
        )
        .scalar()
    )

    return DashboardStats(
        product_count=product_count,
        low_stock_count=low_stock_count,
        inventory_value=Decimal(str(inventory_value)),
        open_orders=int(open_orders),
        sales_this_month=Decimal(str(sales)).quantize(Decimal("0.01")),
        purchases_this_month=Decimal(str(purchases)).quantize(Decimal("0.01")),
    )


@router.get("/dashboard/low-stock", response_model=list[ProductOut])
def low_stock(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProductOut]:
    products = (
        db.query(Product)
        .filter(Product.shop_id == user.shop_id)
        .order_by(Product.quantity_on_hand.asc())
        .all()
    )
    return [_product_out(p) for p in products if p.quantity_on_hand <= p.reorder_level]

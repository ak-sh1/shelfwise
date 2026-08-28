from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_owner
from app.database import get_db
from app.models import MovementType, Order, OrderLine, OrderStatus, OrderType, Product, StockMovement, User
from app.schemas import OrderCreate, OrderLineOut, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_out(order: Order) -> OrderOut:
    lines: list[OrderLineOut] = []
    total = Decimal("0")
    for line in order.lines:
        line_total = (line.unit_price * line.quantity).quantize(Decimal("0.01"))
        total += line_total
        lines.append(
            OrderLineOut(
                id=line.id,
                product_id=line.product_id,
                product_sku=line.product.sku,
                product_name=line.product.name,
                quantity=line.quantity,
                unit_price=line.unit_price,
                line_total=line_total,
            )
        )
    return OrderOut(
        id=order.id,
        order_type=order.order_type,
        status=order.status,
        counterparty=order.counterparty,
        notes=order.notes,
        created_at=order.created_at,
        confirmed_at=order.confirmed_at,
        lines=lines,
        total=total,
    )


def _get_shop_order(db: Session, order_id: int, shop_id: int) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.lines).joinedload(OrderLine.product))
        .filter(Order.id == order_id, Order.shop_id == shop_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("", response_model=list[OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrderOut]:
    orders = (
        db.query(Order)
        .options(joinedload(Order.lines).joinedload(OrderLine.product))
        .filter(Order.shop_id == user.shop_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_out(o) for o in orders]


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderOut:
    order = Order(
        shop_id=user.shop_id,
        order_type=body.order_type,
        status=OrderStatus.draft,
        counterparty=body.counterparty.strip(),
        notes=body.notes,
        created_by_id=user.id,
    )
    db.add(order)
    db.flush()

    for line in body.lines:
        product = (
            db.query(Product)
            .filter(Product.id == line.product_id, Product.shop_id == user.shop_id)
            .first()
        )
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {line.product_id} not found")

        unit_price = line.unit_price
        if unit_price is None:
            unit_price = (
                product.unit_cost if body.order_type == OrderType.purchase else product.unit_price
            )

        db.add(
            OrderLine(
                order_id=order.id,
                product_id=product.id,
                quantity=line.quantity,
                unit_price=unit_price,
            )
        )

    db.commit()
    return _order_out(_get_shop_order(db, order.id, user.shop_id))


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderOut:
    return _order_out(_get_shop_order(db, order_id, user.shop_id))


@router.post("/{order_id}/confirm", response_model=OrderOut)
def confirm_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderOut:
    order = _get_shop_order(db, order_id, user.shop_id)
    if order.status != OrderStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft orders can be confirmed")

    # Validate stock for sales before mutating
    if order.order_type == OrderType.sale:
        for line in order.lines:
            if line.product.quantity_on_hand < line.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient stock for {line.product.sku}: "
                        f"have {line.product.quantity_on_hand}, need {line.quantity}"
                    ),
                )

    for line in order.lines:
        if order.order_type == OrderType.purchase:
            delta = line.quantity
            movement_type = MovementType.purchase
        else:
            delta = -line.quantity
            movement_type = MovementType.sale

        line.product.quantity_on_hand += delta
        db.add(
            StockMovement(
                product_id=line.product_id,
                movement_type=movement_type,
                quantity_delta=delta,
                note=f"Order #{order.id}",
                created_by_id=user.id,
                order_id=order.id,
            )
        )

    order.status = OrderStatus.confirmed
    order.confirmed_at = datetime.now(timezone.utc)
    db.commit()
    return _order_out(_get_shop_order(db, order.id, user.shop_id))


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
) -> OrderOut:
    order = _get_shop_order(db, order_id, user.shop_id)
    if order.status != OrderStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft orders can be cancelled")
    order.status = OrderStatus.cancelled
    db.commit()
    return _order_out(_get_shop_order(db, order.id, user.shop_id))

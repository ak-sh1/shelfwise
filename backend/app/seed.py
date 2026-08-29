from decimal import Decimal

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import MovementType, Product, Shop, StockMovement, User, UserRole


SEED_PRODUCTS = [
    {
        "sku": "MUG-001",
        "name": "Stoneware Coffee Mug",
        "description": "12oz matte ceramic mug, charcoal",
        "category": "Drinkware",
        "unit_cost": Decimal("4.50"),
        "unit_price": Decimal("14.00"),
        "quantity_on_hand": 48,
        "reorder_level": 20,
    },
    {
        "sku": "NBK-014",
        "name": "A5 Dot Grid Notebook",
        "description": "Softcover 120 pages",
        "category": "Stationery",
        "unit_cost": Decimal("2.10"),
        "unit_price": Decimal("8.50"),
        "quantity_on_hand": 12,
        "reorder_level": 15,
    },
    {
        "sku": "PEN-220",
        "name": "Gel Pen Set (4)",
        "description": "Black, blue, red, green",
        "category": "Stationery",
        "unit_cost": Decimal("1.25"),
        "unit_price": Decimal("5.00"),
        "quantity_on_hand": 80,
        "reorder_level": 30,
    },
    {
        "sku": "BAG-090",
        "name": "Canvas Tote Bag",
        "description": "Natural cotton tote with reinforced handles",
        "category": "Bags",
        "unit_cost": Decimal("3.75"),
        "unit_price": Decimal("16.00"),
        "quantity_on_hand": 6,
        "reorder_level": 10,
    },
    {
        "sku": "CND-033",
        "name": "Cedar Candle",
        "description": "Soy wax, 8oz tin",
        "category": "Home",
        "unit_cost": Decimal("5.00"),
        "unit_price": Decimal("22.00"),
        "quantity_on_hand": 22,
        "reorder_level": 8,
    },
    {
        "sku": "TEE-101",
        "name": "Logo Tee — Unisex M",
        "description": "Organic cotton, forest green",
        "category": "Apparel",
        "unit_cost": Decimal("7.20"),
        "unit_price": Decimal("28.00"),
        "quantity_on_hand": 3,
        "reorder_level": 12,
    },
]


def seed_if_empty(db: Session) -> None:
    if db.query(Shop).first() is not None:
        backfill_missing_opening_movements(db)
        return

    shop = Shop(name="Northfield Goods")
    db.add(shop)
    db.flush()

    owner = User(
        shop_id=shop.id,
        email="owner@shelfwise.demo",
        full_name="Avery Owner",
        password_hash=hash_password("owner123"),
        role=UserRole.owner,
    )
    staff = User(
        shop_id=shop.id,
        email="staff@shelfwise.demo",
        full_name="Sam Staff",
        password_hash=hash_password("staff123"),
        role=UserRole.staff,
    )
    db.add_all([owner, staff])
    db.flush()

    for item in SEED_PRODUCTS:
        product = Product(shop_id=shop.id, **item)
        db.add(product)
        db.flush()
        if product.quantity_on_hand:
            db.add(
                StockMovement(
                    product_id=product.id,
                    movement_type=MovementType.adjust,
                    quantity_delta=product.quantity_on_hand,
                    note="Opening stock",
                    created_by_id=owner.id,
                )
            )

    db.commit()


def backfill_missing_opening_movements(db: Session) -> None:
    """For DBs seeded before movements were recorded."""
    if db.query(StockMovement).first() is not None:
        return
    owner = db.query(User).filter(User.role == UserRole.owner).first()
    products = db.query(Product).all()
    for product in products:
        if product.quantity_on_hand <= 0:
            continue
        db.add(
            StockMovement(
                product_id=product.id,
                movement_type=MovementType.adjust,
                quantity_delta=product.quantity_on_hand,
                note="Opening stock",
                created_by_id=owner.id if owner else None,
            )
        )
    db.commit()

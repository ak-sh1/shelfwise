from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import OrderStatus, OrderType, UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    shop_id: int
    shop_name: str


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str = "Uncategorized"
    unit_cost: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    quantity_on_hand: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=5, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    unit_cost: Decimal | None = None
    unit_price: Decimal | None = None
    reorder_level: int | None = Field(default=None, ge=0)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    description: str | None
    category: str
    unit_cost: Decimal
    unit_price: Decimal
    quantity_on_hand: int
    reorder_level: int
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime


class StockAdjustRequest(BaseModel):
    quantity_delta: int
    note: str | None = None


class OrderLineCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = None


class OrderCreate(BaseModel):
    order_type: OrderType
    counterparty: str = Field(min_length=1, max_length=200)
    notes: str | None = None
    lines: list[OrderLineCreate] = Field(min_length=1)


class OrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_type: OrderType
    status: OrderStatus
    counterparty: str
    notes: str | None
    created_at: datetime
    confirmed_at: datetime | None
    lines: list[OrderLineOut]
    total: Decimal


class DashboardStats(BaseModel):
    product_count: int
    low_stock_count: int
    inventory_value: Decimal
    open_orders: int
    sales_this_month: Decimal
    purchases_this_month: Decimal


class CategorizeRequest(BaseModel):
    name: str
    description: str | None = None


class CategorizeResponse(BaseModel):
    category: str
    source: Literal["ai", "heuristic"]
    detail: str | None = None


class CsvImportResult(BaseModel):
    created: int
    updated: int
    errors: list[str]

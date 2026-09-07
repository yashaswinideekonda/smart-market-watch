from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from passlib.context import CryptContext

from app.database.session import get_db
from app.models.user import User
from app.models.watchlist import Watchlist
from app.models.watchlist_stock import WatchlistStock


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)


pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(
    request: AuthRequest,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(User.email == request.email)
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user = User(
        email=request.email,
        password_hash=pwd_context.hash(request.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create a default watchlist for the new user.
    watchlist = Watchlist(
        user_id=user.id,
        name="My Watchlist",
    )

    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)

    # Add starter stocks so the user can immediately explore the app.
    for symbol in ["INFY", "TCS", "RELIANCE", "HDFCBANK"]:
        db.add(
            WatchlistStock(
                watchlist_id=watchlist.id,
                symbol=symbol,
            )
        )

    db.commit()

    return {
        "message": "Account created successfully",
        "user_id": user.id,
        "email": user.email,
    }


@router.post("/login")
def login(
    request: AuthRequest,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(User.email == request.email)
    )

    if not user or not pwd_context.verify(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    return {
        "message": "Login successful",
        "user_id": user.id,
        "email": user.email,
    }
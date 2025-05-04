from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
from datetime import datetime
import uuid

app = FastAPI(title="Item CRUD API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Item model
class ItemBase(BaseModel):
    name: str
    value: int

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    created_at: datetime
    
    class Config:
        from_attributes = True

# In-memory database
items_db = {
    "vocabSize": Item(name="vocabSize", value=200000, created_at=datetime.now()),
    "embeddingDim": Item(name="embeddingDim", value=12288, created_at=datetime.now()),
    "attentionHeads": Item(name="attentionHeads", value=96, created_at=datetime.now()),
    "neurons": Item(name="neurons", value=49152, created_at=datetime.now()),
    "experts": Item(name="experts", value=8, created_at=datetime.now()),
    "gpus": Item(name="gpus", value=1, created_at=datetime.now()),
    "tflops": Item(name="tflops", value=989, created_at=datetime.now()),
    "parameters": Item(name="parameters", value=10000000000, created_at=datetime.now()),
    "tokens": Item(name="tokens", value=10000000000, created_at=datetime.now()),
    "layers": Item(name="layers", value=60, created_at=datetime.now()),
    "total": Item(name="total", value=621011435520, created_at=datetime.now()),
}



# CRUD operations
@app.post("/items/", response_model=Item, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate):  
    db_item = Item(
        **item.model_dump(),
        created_at=datetime.now()
    )
    items_db[item.name] = db_item
    return db_item


@app.get("/items/{item_name}", response_model=Item)
def read_item(item_name: str):
    if item_name not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return items_db[item_name]

@app.put("/items/{item_name}", response_model=Item)
def update_item(item: ItemBase):
    if item.name not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    
    stored_item = items_db[item.name]
    update_data = item.model_dump(exclude_unset=True)
    
    # Update the stored item with new values
    for field, value in update_data.items():
        setattr(stored_item, field, value)
    
    items_db[item.name] = stored_item
    return stored_item

if __name__ == "__main__":
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)

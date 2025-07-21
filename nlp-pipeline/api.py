from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import shutil
import os
from preprocess import PDFPreprocessor
import chromadb
from chromadb.config import Settings

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    # Save uploaded file
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Process PDF
    preprocessor = PDFPreprocessor(file_location)
    preprocessor.extract_text_from_pdf()
    preprocessor.preprocess_text()
    preprocessor.train_word2vec()
    vectors = preprocessor.get_vectors()
    # Store in ChromaDB (Docker server)
    client = chromadb.HttpClient(host="localhost", port=8000)
    collection = client.get_or_create_collection("pdf_vectors")
    ids = [f"{file.filename}_token_{i}" for i in range(len(preprocessor.cleaned_tokens))]
    metadatas = [{"token": token, "source": file.filename} for token in preprocessor.cleaned_tokens]
    collection.add(
        embeddings=vectors.tolist(),
        metadatas=metadatas,
        ids=ids
    )
    return JSONResponse({"message": f"Processed and stored {len(vectors)} vectors from {file.filename}"})

@app.get("/get_data/")
async def get_data():
    client = chromadb.HttpClient(host="localhost", port=8000)
    collection = client.get_or_create_collection("pdf_vectors")
    results = collection.get(limit=10, include=["embeddings", "metadatas"])
    # Convert embeddings to lists for JSON serialization
    if results.get("embeddings") is not None:
        results["embeddings"] = [list(e) if e is not None else None for e in results["embeddings"]]
    return {"data": results}

# To run: uvicorn api:app --reload 
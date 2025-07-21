import os
import nltk
nltk.download('all')

# Ensure all required NLTK resources are downloaded
resources = ['punkt', 'stopwords', 'wordnet']
for resource in resources:
    try:
        nltk.data.find(f'tokenizers/{resource}' if resource == 'punkt' else f'corpora/{resource}')
    except LookupError:
        nltk.download(resource)

from pdfminer.high_level import extract_text
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from gensim.models import Word2Vec
import numpy as np
import chromadb
from chromadb.config import Settings

class PDFPreprocessor:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.text = None
        self.tokens = None
        self.cleaned_tokens = None
        self.word2vec_model = None
        self.vectors = None

    def extract_text_from_pdf(self):
        self.text = extract_text(self.pdf_path)
        return self.text

    def preprocess_text(self):
        # Normalization: lowercase
        text = self.text.lower()
        # Tokenization
        tokens = nltk.word_tokenize(text)
        # Remove non-alphabetic tokens (including Nepali characters)
        tokens = [word for word in tokens if word.isalpha() or any(ord(c) > 127 for c in word)]
        # For Nepali text, we'll skip English stopwords as they may not be relevant
        # Remove very short tokens (likely noise)
        tokens = [word for word in tokens if len(word) > 1]
        # For Nepali, we'll skip lemmatization as WordNet is English-specific
        # tokens = [lemmatizer.lemmatize(word) for word in tokens]
        self.cleaned_tokens = tokens
        return tokens

    def train_word2vec(self):
        # Word2Vec expects a list of sentences, each a list of words
        self.word2vec_model = Word2Vec([self.cleaned_tokens], vector_size=100, window=5, min_count=1, workers=2)
        return self.word2vec_model

    def get_vectors(self):
        # Get vectors for each token
        self.vectors = np.array([self.word2vec_model.wv[word] for word in self.cleaned_tokens if word in self.word2vec_model.wv])
        return self.vectors

if __name__ == "__main__":
    # Set the PDF filename directly
    pdf_path = "bima.pdf"
    preprocessor = PDFPreprocessor(pdf_path)
    print("Extracting text from PDF...")
    preprocessor.extract_text_from_pdf()
    # Display first 500 characters of extracted text
    print("\n--- Extracted Text (first 500 chars) ---")
    print(preprocessor.text[:500])
    print("\nPreprocessing text...")
    preprocessor.preprocess_text()
    print("Training Word2Vec model...")
    preprocessor.train_word2vec()
    print("Extracting vectors...")
    vectors = preprocessor.get_vectors()
    print(f"Extracted {len(vectors)} vectors.")
    # Display first 5 vectors
    print("\n--- Sample Vectors (first 5) ---")
    for i, vec in enumerate(vectors[:5]):
        print(f"Vector {i+1}: {vec}")

    # Store in ChromaDB
    print("\nStoring vectors in ChromaDB...")
    client = chromadb.HttpClient(host="localhost", port=8000)
    collection = client.get_or_create_collection("pdf_vectors")
    # Each token and its vector
    ids = [f"token_{i}" for i in range(len(preprocessor.cleaned_tokens))]
    metadatas = [{"token": token} for token in preprocessor.cleaned_tokens]
    collection.add(
        embeddings=vectors.tolist(),
        metadatas=metadatas,
        ids=ids
    )
    print(f"Stored {len(vectors)} vectors in ChromaDB collection 'pdf_vectors'.") 
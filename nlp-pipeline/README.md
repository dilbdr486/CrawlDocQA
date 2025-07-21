# NLP PDF Question Answering Preprocessing

This project provides a pipeline to extract text from PDF files, preprocess it using professional NLP techniques, vectorize the text using Word2Vec, and prepare it for storage in a vector database.

## Features

- PDF text extraction
- NLP preprocessing: normalization, tokenization, stopword removal, lemmatization
- Word2Vec vectorization
- Ready for integration with vector databases (e.g., FAISS)

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Download NLTK resources (done automatically on first run).

## Usage

Run the preprocessing script on a PDF file:

```bash
python preprocess.py <path_to_pdf>
```

## Next Steps

- Integrate with a vector database for storage and retrieval.
- Build a question answering interface on top of the vector store.

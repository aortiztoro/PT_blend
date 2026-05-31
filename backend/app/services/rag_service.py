import chromadb
from groq import Groq
from pypdf import PdfReader
import io

from ..core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
chroma_client = chromadb.Client()


def get_collection(plan_id: int):
    return chroma_client.get_or_create_collection(name=f"plan_{plan_id}")


def process_document(plan_id: int, filename: str, content: bytes) -> int:
    text = ""
    if filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        for page in reader.pages:
            text += page.extract_text() or ""
    else:
        text = content.decode("utf-8", errors="ignore")

    # Dividir en chunks de ~500 caracteres
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    chunks = [c for c in chunks if c.strip()]

    collection = get_collection(plan_id)
    collection.add(
        documents=chunks,
        ids=[f"{filename}_{i}" for i in range(len(chunks))]
    )

    return len(chunks)


def answer_question(plan_id: int, question: str) -> str:
    collection = get_collection(plan_id)

    if collection.count() == 0:
        return "No documents have been uploaded for this plan yet."

    results = collection.query(query_texts=[question], n_results=3)
    context_chunks = results["documents"][0]
    context = "\n\n".join(context_chunks)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a study assistant. Answer questions based only on the provided context. If the answer is not in the context, say so clearly."
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}"
            }
        ],
        temperature=0.3,
    )

    return response.choices[0].message.content
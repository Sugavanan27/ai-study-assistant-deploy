import os
from typing import List, Tuple
import PyPDF2
from docx import Document

def extract_text_with_pages_from_pdf(file_path: str) -> List[Tuple[str, int]]:
    """Extracts text page-by-page from a PDF file. Returns List of (text, page_number)."""
    pages_data = []
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    pages_data.append((page_text, idx + 1))
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    return pages_data

def extract_text_with_pages_from_docx(file_path: str) -> List[Tuple[str, int]]:
    """Extracts text from a DOCX file. Returns text as a single page (None page)."""
    text = ""
    try:
        doc = Document(file_path)
        for paragraph in doc.paragraphs:
            if paragraph.text:
                text += paragraph.text + "\n"
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
    return [(text, None)]

def extract_text_with_pages_from_txt(file_path: str) -> List[Tuple[str, int]]:
    """Extracts text from a TXT/MD file. Returns text as a single page (None page)."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            return [(content, None)]
    except UnicodeDecodeError:
        try:
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()
                return [(content, None)]
        except Exception as e:
            raise ValueError(f"Failed to read text file: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to read text file: {str(e)}")

def extract_pages(file_path: str) -> List[Tuple[str, int]]:
    """Extracts pages and text content based on the file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_with_pages_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return extract_text_with_pages_from_docx(file_path)
    elif ext in [".txt", ".md"]:
        return extract_text_with_pages_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

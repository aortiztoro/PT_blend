from fastapi import APIRouter, Depends, UploadFile, File
from ...schemas.study_plan import StudyPlanCreate, StudyPlanRead, StudyPlanUpdate
from ...schemas.study_task import StudyTaskCreate, StudyTaskRead, StudyTaskUpdate
from ...services.plan_service import PlanService
from ...services.task_service import TaskService
from ...services.rag_service import process_document, answer_question
from ..deps import get_plan_service, get_task_service
from pydantic import BaseModel

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("", response_model=StudyPlanRead, status_code=201)
def create_plan(data: StudyPlanCreate, svc: PlanService = Depends(get_plan_service)):
    return svc.create_plan(data)


@router.get("/{plan_id}", response_model=StudyPlanRead)
def get_plan(plan_id: int, svc: PlanService = Depends(get_plan_service)):
    return svc.get_plan(plan_id)


@router.patch("/{plan_id}", response_model=StudyPlanRead)
def update_plan(
    plan_id: int,
    data: StudyPlanUpdate,
    svc: PlanService = Depends(get_plan_service),
):
    return svc.update_plan(plan_id, data)


@router.post("/{plan_id}/tasks", response_model=StudyTaskRead, status_code=201)
def create_task(
    plan_id: int, data: StudyTaskCreate, svc: TaskService = Depends(get_task_service)
):
    return svc.create_task(plan_id, data)


@router.get("/{plan_id}/tasks", response_model=list[StudyTaskRead])
def get_tasks(plan_id: int, svc: TaskService = Depends(get_task_service)):
    return svc.get_tasks_by_plan(plan_id)


@router.patch("/{plan_id}/tasks/{task_id}", response_model=StudyTaskRead)
def update_task(
    plan_id: int,
    task_id: int,
    data: StudyTaskUpdate,
    svc: TaskService = Depends(get_task_service),
):
    return svc.update_task(plan_id, task_id, data)


@router.post("/{plan_id}/generate-tasks", response_model=list[StudyTaskRead], status_code=201)
def generate_tasks(
    plan_id: int,
    svc: TaskService = Depends(get_task_service),
):
    return svc.generate_tasks(plan_id)


@router.post("/{plan_id}/documents", status_code=201)
async def upload_document(
    plan_id: int,
    file: UploadFile = File(...),
    svc: PlanService = Depends(get_plan_service),
):
    if not svc.get_plan(plan_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Plan not found")
    
    content = await file.read()
    chunks = process_document(plan_id, file.filename, content)
    return {"filename": file.filename, "chunks_processed": chunks}


class ChatRequest(BaseModel):
    question: str


@router.post("/{plan_id}/chat")
def chat_with_documents(
    plan_id: int,
    body: ChatRequest,
    svc: PlanService = Depends(get_plan_service),
):
    if not svc.get_plan(plan_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Plan not found")
    
    answer = answer_question(plan_id, body.question)
    return {"answer": answer}
from groq import Groq
from pydantic import BaseModel

from ..core.config import settings


class GeneratedTask(BaseModel):
    title: str
    estimated_hours: float


class GeneratedTaskList(BaseModel):
    tasks: list[GeneratedTask]


def generate_tasks_from_plan(
    goal: str,
    hours_per_week: float,
    target_date: str | None,
) -> list[GeneratedTask]:
    
    client = Groq(api_key=settings.GROQ_API_KEY)

    date_info = f"The student must finish by {target_date}." if target_date else "No due date specified."

    prompt = f"""You are a study planning assistant. Generate a list of concrete study tasks for the following plan:

Goal: {goal}
Hours per week available: {hours_per_week}
{date_info}

Return ONLY a JSON object with this exact structure, no explanation, no markdown:
{{
  "tasks": [
    {{
      "title": "Task title here",
      "estimated_hours": 2.0
    }}
  ]
}}

Rules:
- Generate between 4 and 8 tasks
- Each task should be concrete and actionable
- estimated_hours should be realistic given the hours_per_week
- Total hours should not exceed what is available before the due date
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content
    parsed = GeneratedTaskList.model_validate_json(raw)
    return parsed.tasks
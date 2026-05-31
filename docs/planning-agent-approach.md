# Planning Agent for Multi-step Plan Generation — Approach

## Overview

This document describes the architectural approach for implementing a planning agent
that intelligently generates study plans considering multiple constraints.

## Agent Architecture

The agent follows a **ReAct** (Reasoning + Acting) pattern, where it iteratively
reasons about the problem and takes actions using tools until it produces a valid plan.

User Request
↓
Agent (LLM with tools)
↓
┌─────────────────────────────┐
│  1. Decompose goal          │
│  2. Generate tasks per topic│
│  3. Validate constraints    │
│  4. Adjust if needed        │
│  5. Return final plan       │
└─────────────────────────────┘
↓
Persisted Tasks in DB

## Tools

### 1. `decompose_goal`
Breaks the main goal into 3-5 subtopics using the LLM.

**Input:** `goal: str`  
**Output:** `list[str]` — list of subtopics

### 2. `generate_tasks_for_subtopic`
Generates concrete tasks for a given subtopic.

**Input:** `subtopic: str, hours_available: float`  
**Output:** `list[GeneratedTask]`

### 3. `validate_constraints`
Checks that the total estimated hours fit within the available time.

**Input:** `tasks: list[Task], hours_per_week: float, weeks_until_due: int`  
**Output:** `{ valid: bool, total_hours: float, available_hours: float, message: str }`

### 4. `retrieve_context` (RAG)
Retrieves relevant content from uploaded documents to enrich task generation.

**Input:** `plan_id: int, query: str`  
**Output:** `str` — relevant context chunks

## Agent Loop

```python
def run_agent(plan: StudyPlan) -> list[Task]:
    # Step 1: Decompose goal into subtopics
    subtopics = decompose_goal(plan.goal)
    
    # Step 2: Calculate available time
    weeks = weeks_until(plan.target_date) if plan.target_date else 8
    hours_available = plan.hours_per_week * weeks
    hours_per_subtopic = hours_available / len(subtopics)
    
    # Step 3: Generate tasks per subtopic
    all_tasks = []
    for subtopic in subtopics:
        # Optionally retrieve RAG context
        context = retrieve_context(plan.id, subtopic)
        tasks = generate_tasks_for_subtopic(subtopic, hours_per_subtopic, context)
        all_tasks.extend(tasks)
    
    # Step 4: Validate constraints
    result = validate_constraints(all_tasks, plan.hours_per_week, weeks)
    
    # Step 5: If invalid, trim tasks to fit
    if not result["valid"]:
        all_tasks = trim_to_fit(all_tasks, result["available_hours"])
    
    return all_tasks
```

## API Endpoint
import {
  Badge,
  Button,
  Group,
  Loader,
  Progress,
  Text,
  Title,
  Textarea,
  Paper,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconCalendar,
  IconCircleCheck,
  IconClock,
  IconPlus,
  IconTarget,
  IconSparkles,
  IconUpload,
  IconSend,
  IconRobot,
  IconUser,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";
import { api, type StudyTask } from "../../api/client";
import AddTaskModal from "../../components/task/AddTaskModal";
import TaskItem from "../../components/task/TaskItem";
import styles from "./PlanDetail.module.css";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const id = Number(planId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [addTaskOpened, { open: openAddTask, close: closeAddTask }] =
    useDisclosure(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", id],
    queryFn: () => api.getPlan(id),
    enabled: !!id,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<StudyTask[]>({
    queryKey: ["tasks", id],
    queryFn: () => api.getTasks(id),
    enabled: !!id,
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      api.toggleTask(id, taskId, completed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      qc.invalidateQueries({ queryKey: ["taskStats"] });
    },
  });

  const generateTasks = useMutation({
    mutationFn: () => api.generateTasks(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      qc.invalidateQueries({ queryKey: ["taskStats"] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading...");
    try {
      const result = await api.uploadDocument(id, file);
      setUploadStatus(`✓ ${result.filename} uploaded (${result.chunks_processed} chunks)`);
    } catch {
      setUploadStatus("Upload failed");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const res = await api.chat(id, question);
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error getting answer." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const isComplete = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalHours = tasks.reduce((s, t) => s + t.estimated_hours, 0);

  if (planLoading) {
    return (
      <div className={styles.loadingPage}>
        <Loader color="cyan" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.loadingPage}>
        <Text c="dimmed">Plan not found.</Text>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Group gap="sm">
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            <IconArrowLeft size={16} />
          </button>
          <Text className={styles.breadcrumb} onClick={() => navigate("/")}>Plans</Text>
          <Text className={styles.breadcrumbSep}>/</Text>
          <Text className={styles.breadcrumbCurrent}>{plan.goal}</Text>
        </Group>
      </header>

      <main className={styles.main}>
        <div className={`${styles.planCard} ${isComplete ? styles.planCardComplete : ""}`}>
          <div className={styles.planCardInner}>
            <div>
              <Text className={styles.planLabel}>Goal</Text>
              <Title order={2} className={styles.planGoal}>{plan.goal}</Title>
              {plan.description && (
                <Text className={styles.planDescription}>{plan.description}</Text>
              )}
            </div>
            <div className={styles.planMeta}>
              <Group gap="lg" wrap="wrap">
                <Group gap={6}>
                  <IconClock size={14} color="var(--c-turquoise)" />
                  <Text className={styles.metaText}>{plan.hours_per_week}h / week</Text>
                </Group>
                {plan.target_date && (
                  <Group gap={6}>
                    <IconCalendar size={14} color="var(--c-turquoise)" />
                    <Text className={styles.metaText}>{formatDate(plan.target_date)}</Text>
                  </Group>
                )}
                <Group gap={6}>
                  <IconTarget size={14} color="var(--c-turquoise)" />
                  <Text className={styles.metaText}>{completedCount}/{totalCount} tasks</Text>
                </Group>
              </Group>
              {totalCount > 0 && (
                <Progress value={progressPct} color={isComplete ? "teal" : "cyan"} size="sm" className={styles.planProgress} />
              )}
            </div>
          </div>
        </div>

        <div className={styles.tasksSection}>
          <Group justify="space-between" mb="lg">
            <Title order={4} className={styles.tasksTitle}>Tasks</Title>
            <Group gap="sm">
              {tasks.length > 0 && (
                <Badge color="cyan" variant="light" size="sm">{totalHours}h total</Badge>
              )}
              <Button
                leftSection={<IconSparkles size={13} />}
                color="cyan"
                size="xs"
                variant="filled"
                onClick={() => generateTasks.mutate()}
                loading={generateTasks.isPending}
              >
                Generate with AI
              </Button>
              <Button
                leftSection={<IconPlus size={13} />}
                color="cyan"
                size="xs"
                variant="light"
                onClick={openAddTask}
              >
                Add task
              </Button>
            </Group>
          </Group>

          {isComplete && (
            <div className={styles.completionBanner}>
              <IconCircleCheck size={20} color="var(--c-turquoise)" />
              <div>
                <Text className={styles.completionTitle}>All tasks complete</Text>
                <Text className={styles.completionSub}>Great work — you've finished every task in this plan.</Text>
              </div>
            </div>
          )}

          {tasksLoading ? (
            <div className={styles.loader}><Loader color="cyan" size="sm" /></div>
          ) : tasks.length === 0 ? (
            <div className={styles.emptyTasks}>
              <IconTarget size={32} stroke={1.2} color="var(--c-cool-gray)" />
              <Text className={styles.emptyText}>No tasks yet. Break your goal into actionable steps.</Text>
            </div>
          ) : (
            <div className={styles.taskList}>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={(taskId, completed) => toggleTask.mutate({ taskId, completed })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Document Chat Section */}
        <div className={styles.tasksSection} style={{ marginTop: "2rem" }}>
          <Group justify="space-between" mb="lg">
            <Title order={4} className={styles.tasksTitle}>Document Chat</Title>
            <Button
              leftSection={<IconUpload size={13} />}
              color="cyan"
              size="xs"
              variant="light"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Document
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
          </Group>

          {uploadStatus && (
            <Text size="xs" c="dimmed" mb="sm">{uploadStatus}</Text>
          )}

          <Paper p="md" style={{ background: "var(--c-dark-2, #1a1a2e)", borderRadius: 8, minHeight: 200 }}>
            <ScrollArea h={250} mb="sm">
              {chatMessages.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" mt="xl">
                  Upload a document and ask questions about it.
                </Text>
              ) : (
                chatMessages.map((msg, i) => (
                  <Group key={i} align="flex-start" mb="sm" justify={msg.role === "user" ? "flex-end" : "flex-start"}>
                    {msg.role === "assistant" && <IconRobot size={16} color="var(--c-turquoise)" />}
                    <Paper
                      p="xs"
                      style={{
                        background: msg.role === "user" ? "var(--c-turquoise, #00bcd4)" : "#2a2a3e",
                        color: msg.role === "user" ? "#000" : "#fff",
                        maxWidth: "75%",
                        borderRadius: 8,
                      }}
                    >
                      <Text size="sm">{msg.content}</Text>
                    </Paper>
                    {msg.role === "user" && <IconUser size={16} color="var(--c-turquoise)" />}
                  </Group>
                ))
              )}
              {chatLoading && (
                <Group gap="xs" mt="sm">
                  <IconRobot size={16} color="var(--c-turquoise)" />
                  <Loader size="xs" color="cyan" />
                </Group>
              )}
            </ScrollArea>

            <Group gap="sm">
              <Textarea
                style={{ flex: 1 }}
                placeholder="Ask a question about your documents..."
                value={chatInput}
                onChange={(e) => setChatInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
                autosize
                minRows={1}
                maxRows={3}
              />
              <Button
                color="cyan"
                onClick={handleChat}
                loading={chatLoading}
                disabled={!chatInput.trim()}
              >
                <IconSend size={16} />
              </Button>
            </Group>
          </Paper>
        </div>
      </main>

      <AddTaskModal opened={addTaskOpened} onClose={closeAddTask} planId={id} />
    </div>
  );
}
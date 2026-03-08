'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { api } from '@/lib/api-client';
import type {
  DailyReportWithTasks,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  StressLevel,
} from '@daily-report/shared';
import { createTaskSchema, updateTaskSchema } from '@daily-report/shared';
import type { Team } from '@daily-report/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---- Types ----

interface TeamWithRole {
  team: Team;
  role: 'owner' | 'member';
}

// ---- Searchable Team Select (form field) ----

function SearchableTeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: TeamWithRole[];
  value: string;
  onChange: (teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = teams.filter((t) =>
    t.team.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = teams.find((t) => t.team.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
          else setSearch('');
        }}
        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="truncate">{selected?.team.name ?? 'Select team'}</span>
        <svg className={`ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No teams found</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.team.id}
                  type="button"
                  onClick={() => {
                    onChange(t.team.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
                    t.team.id === value ? 'bg-accent font-medium' : ''
                  }`}
                >
                  {t.team.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Team Selector (searchable dropdown) ----

function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
}: {
  teams: TeamWithRole[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = teams.filter((t) =>
    t.team.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedTeam = teams.find((t) => t.team.id === selectedTeamId);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch('');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  if (teams.length <= 1) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 0);
          } else {
            setSearch('');
          }
        }}
        className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
      >
        <span className="max-w-[200px] truncate">
          {selectedTeam?.team.name ?? 'Select team'}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No teams found</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.team.id}
                  type="button"
                  onClick={() => {
                    onSelect(t.team.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent ${
                    t.team.id === selectedTeamId ? 'bg-accent font-medium' : ''
                  }`}
                >
                  <span className="truncate">{t.team.name}</span>
                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                    {t.role}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Task Row ----

function TaskRow({
  task,
  isDraft,
  date,
  teamId,
}: {
  task: Task;
  isDraft: boolean;
  date: string;
  teamId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const editForm = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: task.title,
      estimatedHours: task.estimatedHours,
      sourceLink: task.sourceLink ?? '',
      notes: task.notes ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaskInput) =>
      api.patch<Task>(`/tasks/${task.id}`, data),
    onSuccess: () => {
      toast.success('Task updated');
      setIsEditing(false);
      void queryClient.invalidateQueries({
        queryKey: ['reports', 'daily', date, teamId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      toast.success('Task deleted');
      void queryClient.invalidateQueries({
        queryKey: ['reports', 'daily', date, teamId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });

  function handleDelete() {
    if (window.confirm('Delete this task?')) {
      deleteMutation.mutate();
    }
  }

  function onEditSubmit(data: UpdateTaskInput) {
    // Clean up empty strings to null for optional fields
    const cleaned: UpdateTaskInput = {
      ...data,
      sourceLink: data.sourceLink === '' ? null : data.sourceLink,
      notes: data.notes === '' ? null : data.notes,
    };
    updateMutation.mutate(cleaned);
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-gray-50 p-4">
        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={editForm.control}
              name="sourceLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source link</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Optional notes..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between rounded-lg border p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{task.title}</span>
          <Badge variant="secondary">{task.estimatedHours}h</Badge>
        </div>
        {task.sourceLink && (
          <a
            href={task.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-blue-600 underline hover:text-blue-800"
          >
            {task.sourceLink}
          </a>
        )}
        {task.notes && (
          <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>
        )}
      </div>
      {isDraft && (
        <div className="ml-4 flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Create Task Form ----

function CreateTaskForm({
  date,
  teamId,
  teams,
  onTeamChange,
}: {
  date: string;
  teamId: string;
  teams: TeamWithRole[];
  onTeamChange: (teamId: string) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      estimatedHours: 1,
      sourceLink: '',
      notes: '',
      reportDate: date,
      teamId,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTaskInput) => api.post<Task>('/tasks', data),
    onSuccess: () => {
      toast.success('Task added');
      form.reset({
        title: '',
        estimatedHours: 1,
        sourceLink: '',
        notes: '',
        reportDate: date,
        teamId,
      });
      void queryClient.invalidateQueries({
        queryKey: ['reports', 'daily', date, teamId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });

  function onSubmit(data: CreateTaskInput) {
    // Clean empty strings to undefined for optional fields
    const cleaned: CreateTaskInput = {
      ...data,
      sourceLink: data.sourceLink === '' ? undefined : data.sourceLink,
      notes: data.notes === '' ? undefined : data.notes,
    };
    mutation.mutate(cleaned);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Task</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="What did you work on?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {teams.length > 1 && (
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team *</FormLabel>
                    <FormControl>
                      <SearchableTeamSelect
                        teams={teams}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          onTeamChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="sourceLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source link</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://github.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Optional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---- Date Navigation ----

function DateNavigation({ date }: { date: string }) {
  const router = useRouter();
  const parsedDate = parseISO(date);
  const isViewingToday = isToday(parsedDate);

  function navigateTo(newDate: Date) {
    router.push(`/reports/${format(newDate, 'yyyy-MM-dd')}`);
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateTo(subDays(parsedDate, 1))}
      >
        &larr; Prev
      </Button>
      {!isViewingToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateTo(new Date())}
        >
          Today
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateTo(addDays(parsedDate, 1))}
      >
        Next &rarr;
      </Button>
    </div>
  );
}

// ---- All Teams Report View (for past submitted dates) ----

function AllTeamsReportView({
  teams,
  date,
}: {
  teams: TeamWithRole[];
  date: string;
}) {
  // Fetch reports for all teams in parallel
  const teamQueries = teams.map((t) => ({
    teamId: t.team.id,
    teamName: t.team.name,
    role: t.role,
  }));

  const results = teamQueries.map((tq) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useQuery({
      queryKey: ['reports', 'daily', date, tq.teamId],
      queryFn: () =>
        api.get<DailyReportWithTasks | null>(
          `/reports/daily?date=${date}&teamId=${tq.teamId}`,
        ),
    });
    return { ...tq, ...query };
  });

  const isLoading = results.some((r) => r.isLoading);

  if (isLoading) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        Loading reports...
      </p>
    );
  }

  const allTotalHours = results.reduce(
    (sum, r) => sum + (r.data?.totalHours ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          All Teams
        </span>
        <div className="text-sm font-medium">
          Grand Total: <span className="text-lg">{allTotalHours}</span>h
        </div>
      </div>
      {results.map((r) => {
        const report = r.data?.report ?? null;
        const tasks = r.data?.tasks ?? [];
        const totalHours = r.data?.totalHours ?? 0;

        return (
          <Card key={r.teamId} className="mb-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{r.teamName}</CardTitle>
                {report?.status === 'submitted' && (
                  <Badge className="bg-green-600">Submitted</Badge>
                )}
                {report?.status === 'draft' && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Draft
                  </Badge>
                )}
                {!report && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    No Report
                  </Badge>
                )}
              </div>
              <div className="text-sm font-medium">{totalHours}h</div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No tasks logged for this team.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant="secondary">{task.estimatedHours}h</Badge>
                        </div>
                        {task.sourceLink && (
                          <a
                            href={task.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-sm text-blue-600 underline hover:text-blue-800"
                          >
                            {task.sourceLink}
                          </a>
                        )}
                        {task.notes && (
                          <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---- Stress Level Selector ----

function StressLevelSelector({
  value,
  onChange,
}: {
  value: StressLevel | null;
  onChange: (level: StressLevel) => void;
}) {
  const options: { level: StressLevel; label: string; base: string; selected: string }[] = [
    { level: 'low', label: 'Low', base: 'bg-green-100 text-green-700', selected: 'bg-green-600 text-white' },
    { level: 'medium', label: 'Medium', base: 'bg-yellow-100 text-yellow-700', selected: 'bg-yellow-500 text-white' },
    { level: 'high', label: 'High', base: 'bg-red-100 text-red-700', selected: 'bg-red-600 text-white' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">How stressed are you feeling?</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.level}
            type="button"
            onClick={() => onChange(opt.level)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              value === opt.level ? opt.selected : opt.base
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Stress Level Badge (read-only) ----

function StressLevelBadgeInline({ stressLevel }: { stressLevel: StressLevel | null }) {
  if (!stressLevel) return null;

  const config: Record<StressLevel, { className: string; label: string }> = {
    low: { className: 'bg-green-100 text-green-700', label: 'Stress: Low' },
    medium: { className: 'bg-yellow-100 text-yellow-700', label: 'Stress: Medium' },
    high: { className: 'bg-red-100 text-red-700', label: 'Stress: High' },
  };

  const { className, label } = config[stressLevel];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}

// ---- Main Page ----

export default function DailyReportPage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const date = params.date;
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [stressLevel, setStressLevel] = useState<StressLevel | null>(null);

  // Validate date format
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  // Fetch user teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
  });

  // Auto-select first team if none selected, or restore selection
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].team.id);
    }
    // If selected team is no longer in the list, reset
    if (teams && selectedTeamId && !teams.find((t) => t.team.id === selectedTeamId)) {
      setSelectedTeamId(teams[0]?.team.id ?? null);
    }
  }, [teams, selectedTeamId]);

  const teamId = selectedTeamId;

  // Fetch daily report
  const {
    data: reportData,
    isLoading: reportLoading,
  } = useQuery({
    queryKey: ['reports', 'daily', date, teamId],
    queryFn: () =>
      api.get<DailyReportWithTasks | null>(
        `/reports/daily?date=${date}&teamId=${teamId}`,
      ),
    enabled: !!teamId && isValidDate,
  });

  // Sync stress level from report data
  useEffect(() => {
    if (reportData?.report?.stressLevel) {
      setStressLevel(reportData.report.stressLevel as StressLevel);
    } else {
      setStressLevel(null);
    }
  }, [reportData]);

  // Submit report mutation
  const submitMutation = useMutation({
    mutationFn: (reportId: string) =>
      api.post(`/reports/${reportId}/submit`, stressLevel ? { stressLevel } : {}),
    onSuccess: () => {
      toast.success('Report submitted successfully');
      void queryClient.invalidateQueries({
        queryKey: ['reports', 'daily', date, teamId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit report');
    },
  });

  // Redirect if invalid date
  if (!isValidDate) {
    router.replace(`/reports/${format(new Date(), 'yyyy-MM-dd')}`);
    return null;
  }

  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
  const isViewingToday = isToday(parsedDate);

  const report = reportData?.report ?? null;
  const tasks = reportData?.tasks ?? [];
  const totalHours = reportData?.totalHours ?? 0;
  const isDraft = !report || report.status === 'draft';

  function handleSubmit() {
    if (!report) return;
    if (
      window.confirm(
        'Once submitted, you cannot edit this report. Continue?',
      )
    ) {
      submitMutation.mutate(report.id);
    }
  }

  // Loading states
  if (teamsLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  // No teams
  if (!teamsLoading && (!teams || teams.length === 0)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Join a team to start logging tasks.
            </p>
            <Button asChild>
              <a href="/teams">Go to Teams</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header with date and navigation */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <p className="mt-1 text-muted-foreground">
            <span className={isViewingToday ? 'font-semibold text-foreground' : ''}>
              {formattedDate}
            </span>
            {isViewingToday && (
              <Badge variant="secondary" className="ml-2">
                Today
              </Badge>
            )}
          </p>
        </div>
        <DateNavigation date={date} />
      </div>

      {/* Team selector - for editing (today/draft) */}
      {isDraft && teams && teams.length > 1 && teamId && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Team:</span>
          <TeamSelector
            teams={teams}
            selectedTeamId={teamId}
            onSelect={setSelectedTeamId}
          />
        </div>
      )}

      {/* Past date: show all teams' reports grouped by team */}
      {!isDraft && teams && teams.length > 1 ? (
        <AllTeamsReportView teams={teams} date={date} />
      ) : (
        <>
          {/* Current team name */}
          {teams && teamId && (
            <div className="mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {teams.find((t) => t.team.id === teamId)?.team.name}
              </span>
            </div>
          )}

          {/* Report status */}
          {report && report.status === 'submitted' && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">Submitted</Badge>
                <StressLevelBadgeInline stressLevel={report.stressLevel} />
                <span className="text-sm text-green-800">
                  {report.submittedAt &&
                    `Submitted on ${format(parseISO(report.submittedAt), 'MMM d, yyyy h:mm a')}`}
                </span>
              </div>
            </div>
          )}

          {/* Task list */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Tasks ({tasks.length})
              </CardTitle>
              <div className="text-sm font-medium">
                Total: <span className="text-lg">{totalHours}</span>h
              </div>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <p className="py-4 text-center text-muted-foreground">
                  Loading tasks...
                </p>
              ) : tasks.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  No tasks yet. Add your first task below.
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isDraft={isDraft}
                      date={date}
                      teamId={teamId!}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create task form - only for drafts */}
          {isDraft && teamId && teams && (
            <CreateTaskForm
              date={date}
              teamId={teamId}
              teams={teams}
              onTeamChange={setSelectedTeamId}
            />
          )}

          {/* Stress level selector - only for draft reports with tasks */}
          {report &&
            report.status === 'draft' &&
            tasks.length > 0 && (
              <div className="mt-6">
                <StressLevelSelector
                  value={stressLevel}
                  onChange={setStressLevel}
                />
              </div>
            )}

          {/* Submit button */}
          {report &&
            report.status === 'draft' &&
            tasks.length > 0 && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitMutation.isPending
                    ? 'Submitting...'
                    : 'Submit Report'}
                </Button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

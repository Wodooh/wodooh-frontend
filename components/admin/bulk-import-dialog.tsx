"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import type { CreateUserRequest } from "@/lib/types/admin-user.types";
import type { CreateCollegeRequest } from "@/lib/types/college.types";
import type { CreateDepartmentRequest } from "@/lib/types/department.types";
import type { Course, CreateCourseRequest, CreateSectionRequest } from "@/lib/types/course.types";

// ── Types ───────────────────────────────────────────

type EntityType = "colleges" | "users" | "departments" | "courses";

type ParsedRow = Record<string, unknown>;

interface ValidatedRow {
  data: ParsedRow;
  _valid: boolean;
  _errors: string[];
  _index: number;
}

type FileStatus = "ready" | "importing" | "done" | "error";

interface FileEntry {
  id: string;
  file: File;
  entityType: EntityType | null;
  parsed: ValidatedRow[] | null;
  parseError: string | null;
  status: FileStatus;
  result: { succeeded: number; sectionsCreated: number; failed: number; errors: string[] } | null;
}

// ── Format guide data ──────────────────────────────

const GUIDE: Record<
  EntityType,
  {
    label: string;
    columns: { name: string; type: string; required: boolean; note: string }[];
    csvExample: string;
    jsonExample: string;
  }
> = {
  colleges: {
    label: "Colleges",
    columns: [
      { name: "name",        type: "string", required: true,  note: 'Full college name, e.g. "College of Engineering"' },
      { name: "code",        type: "string", required: true,  note: 'Short uppercase code, e.g. "ENG"' },
      { name: "description", type: "string", required: false, note: "Optional description" },
    ],
    csvExample:  `name,code,description\nCollege of Engineering,ENG,Engineering college\nCollege of Sciences,SCI,`,
    jsonExample: `[\n  { "name": "College of Engineering", "code": "ENG", "description": "Engineering college" },\n  { "name": "College of Sciences", "code": "SCI", "description": "Sciences college" }\n]`,
  },
  users: {
    label: "Users",
    columns: [
      { name: "name",  type: "string", required: true,  note: 'Full display name, e.g. "Jane Smith"' },
      { name: "email", type: "string", required: true,  note: "Unique university email" },
      { name: "role",  type: "enum",   required: true,  note: "admin | instructor | student | chairman" },
    ],
    csvExample:  `name,email,role\nJane Smith,jane@uni.edu,instructor\nJohn Doe,john@uni.edu,student`,
    jsonExample: `[\n  { "name": "Jane Smith", "email": "jane@uni.edu", "role": "instructor" },\n  { "name": "John Doe",  "email": "john@uni.edu",  "role": "student"    }\n]`,
  },
  departments: {
    label: "Departments",
    columns: [
      { name: "name",        type: "string", required: true,  note: 'Full department name, e.g. "Computer Science"' },
      { name: "code",        type: "string", required: true,  note: 'Short uppercase code, e.g. "CS"' },
      { name: "description", type: "string", required: false, note: "Optional description" },
    ],
    csvExample:  `name,code,description\nComputer Science,CS,CS department\nMathematics,MATH,`,
    jsonExample: `[\n  { "name": "Computer Science", "code": "CS", "description": "CS Department" },\n  { "name": "Mathematics", "code": "MATH", "description": "Mathematics Department" }\n]`,
  },
  courses: {
    label: "Courses + Sections",
    columns: [
      { name: "name",                 type: "string", required: true,  note: 'Course title, e.g. "Data Structures"' },
      { name: "code",                 type: "string", required: true,  note: 'Course code, e.g. "CS201"' },
      { name: "credits",              type: "number", required: false, note: "Credit hours (integer)" },
      { name: "departmentId",         type: "string", required: false, note: "Department _id from the system" },
      { name: "description",          type: "string", required: false, note: "Optional description" },
      { name: "section_id",           type: "number", required: false, note: "Optional · 5-digit section ID (10001–99999) · leave blank to auto-generate · repeat the row to add more sections" },
      { name: "section_instructorId", type: "string", required: false, note: "Optional · instructor _id · leave blank for unassigned" },
    ],
    csvExample:  `name,code,credits,section_id,section_instructorId\nData Structures,CS201,3,,\nData Structures,CS201,3,12345,<inst-id>\nCalculus I,MATH101,4,,`,
    jsonExample: `[\n  {\n    "name": "Data Structures",\n    "code": "CS201", "credits": 3,\n    "sections": [\n      { "sectionId": 12345, "instructorId": "<inst-id>" },\n      {}\n    ]\n  },\n  { "name": "Calculus I", "code": "MATH101", "credits": 4 }\n]`,
  },
};

// ── CSV parser ─────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

function parseJson(text: string): ParsedRow[] {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) throw new Error("JSON must be an array of objects");
  return data as ParsedRow[];
}

// ── Validators ─────────────────────────────────────

const VALID_ROLES = new Set(["admin", "instructor", "student", "chairman"]);

function str(v: unknown): string { return String(v ?? "").trim(); }

function validateRows(rows: ParsedRow[], entity: EntityType): ValidatedRow[] {
  return rows.map((data, i) => {
    const errors: string[] = [];
    if (entity === "colleges") {
      if (!str(data.name)) errors.push("name is required");
      if (!str(data.code)) errors.push("code is required");
    } else if (entity === "users") {
      if (!str(data.name)) errors.push("name is required");
      if (!str(data.email)) errors.push("email is required");
      if (!str(data.role)) errors.push("role is required");
      else if (!VALID_ROLES.has(str(data.role).toLowerCase()))
        errors.push("role must be: admin | instructor | student | chairman");
    } else if (entity === "departments") {
      if (!str(data.name)) errors.push("name is required");
      if (!str(data.code)) errors.push("code is required");
    } else if (entity === "courses") {
      if (!str(data.name)) errors.push("name is required");
      if (!str(data.code)) errors.push("code is required");
      const credits = data.credits;
      if (credits !== undefined && credits !== "" && isNaN(Number(credits)))
        errors.push("credits must be a number");
      const sid = data.section_id;
      if (sid !== undefined && sid !== "") {
        const n = Number(sid);
        if (!Number.isInteger(n) || n < 10001 || n > 99999)
          errors.push("section_id must be an integer between 10001 and 99999");
      }
    }
    return { data, _valid: errors.length === 0, _errors: errors, _index: i };
  });
}

// ── Combined template download ─────────────────────

function downloadTemplate() {
  const blob = new Blob([COMBINED_JSON_EXAMPLE], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "wodooh-import-template.json";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Combined JSON detection ────────────────────────

const ENTITY_KEYS: EntityType[] = ["colleges", "departments", "users", "courses"];

async function tryParseCombined(file: File): Promise<FileEntry[] | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as unknown;
    if (typeof data !== "object" || Array.isArray(data) || data === null) return null;
    const obj = data as Record<string, unknown>;
    const found = ENTITY_KEYS.filter(k => Array.isArray(obj[k]));
    if (found.length === 0) return null;
    return found.map((entityType): FileEntry => {
      const rows = obj[entityType] as ParsedRow[];
      const id = `${file.name}-${entityType}-${Date.now()}-${Math.random()}`;
      const label = `${GUIDE[entityType].label} · ${file.name}`;
      const virtualFile = new File([JSON.stringify(rows, null, 2)], label, { type: "application/json" });
      return { id, file: virtualFile, entityType, parsed: validateRows(rows, entityType), parseError: null, status: "ready", result: null };
    });
  } catch { return null; }
}

// ── File parsing helper ────────────────────────────

async function parseFile(file: File, entityType: EntityType | null): Promise<{ parsed: ValidatedRow[] | null; parseError: string | null }> {
  try {
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const rows = ext === "json" ? parseJson(text) : parseCsv(text);
    const parsed = entityType
      ? validateRows(rows, entityType)
      : rows.map((data, i) => ({ data, _valid: false, _errors: ["Select entity type"], _index: i }));
    return { parsed, parseError: null };
  } catch (e) {
    return { parsed: null, parseError: e instanceof Error ? e.message : "Failed to parse file" };
  }
}

// ── Icon atoms ─────────────────────────────────────

const UploadCloud = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const UploadSmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

// ── Entity badge ───────────────────────────────────

const ENTITY_STYLES: Record<EntityType, string> = {
  colleges:    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  users:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  departments: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  courses:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function EntityBadge({ type }: { type: EntityType }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", ENTITY_STYLES[type])}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {GUIDE[type].label}
    </span>
  );
}

// ── Combined example ───────────────────────────────

const COMBINED_JSON_EXAMPLE = `{
  "colleges": [
    { "name": "College of Engineering", "code": "ENG", "description": "Engineering college" }
  ],
  "departments": [
    { "name": "Computer Science", "code": "CS", "description": "CS Department" }
  ],
  "users": [
    { "name": "Jane Smith", "email": "jane@uni.edu", "role": "instructor" }
  ],
  "courses": [
    {
      "name": "Data Structures", "code": "CS201", "credits": 3,
      "sections": [{ "sectionId": 12345 }, {}]
    }
  ]
}`;

// ── Format Guide panel ─────────────────────────────

function FormatGuide() {
  const [tab, setTab] = useState<EntityType | "combined">("combined");

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab strip */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          ["combined",     "All types (combined)"],
          ["colleges",     "Colleges"],
          ["users",        "Users"],
          ["departments",  "Departments"],
          ["courses",      "Courses + Sections"],
        ] as [EntityType | "combined", string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab(key)}
            className="h-7"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Combined tab */}
      {tab === "combined" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Single-file import (JSON only)</p>
            Put all your data in one <code className="rounded bg-muted px-1">`.json`</code> file with a root object that has{" "}
            <code className="rounded bg-muted px-1">colleges</code>,{" "}
            <code className="rounded bg-muted px-1">departments</code>,{" "}
            <code className="rounded bg-muted px-1">users</code>, and/or{" "}
            <code className="rounded bg-muted px-1">courses</code> keys. When uploaded, it is automatically split into one entry per type.
          </div>

          {/* All-fields reference table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[110px]">Type</TableHead>
                  <TableHead className="text-xs font-mono">Field</TableHead>
                  <TableHead className="text-xs w-[60px]">Required</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.entries(GUIDE) as [EntityType, typeof GUIDE[EntityType]][]).flatMap(([entityType, g]) =>
                  g.columns.map((col, i) => (
                    <TableRow key={`${entityType}-${col.name}`}>
                      {i === 0 ? (
                        <TableCell className="align-top">
                          <EntityBadge type={entityType} />
                        </TableCell>
                      ) : (
                        <TableCell />
                      )}
                      <TableCell className="font-mono text-xs font-semibold">{col.name}</TableCell>
                      <TableCell className="text-xs">
                        {col.required
                          ? <span className="text-destructive font-medium">Yes</span>
                          : <span className="text-muted-foreground">No</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{col.note}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Combined JSON format
            </p>
            <div className="relative">
              <pre className="rounded-lg border bg-muted/40 text-xs p-4 overflow-x-auto leading-relaxed whitespace-pre text-foreground">
                {COMBINED_JSON_EXAMPLE}
              </pre>
              <button
                onClick={downloadTemplate}
                title="Download this example"
                className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <DownloadIcon /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-entity tabs */}
      {tab !== "combined" && (() => {
        const g = GUIDE[tab];
        return (
          <div className="flex flex-col gap-4">
            {tab === "courses" && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1">Sections — every field is optional</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><code className="rounded bg-muted px-1">sectionId</code> — leave blank and the server auto-generates a 5-digit ID in the course's dept slot.</li>
                  <li><code className="rounded bg-muted px-1">instructorId</code> — omit to leave the section unassigned.</li>
                  <li>An empty <code className="rounded bg-muted px-1">{"{}"}</code> creates a section with everything auto-defaulted.</li>
                </ul>
              </div>
            )}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Column</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Required</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.columns.map(col => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono text-xs font-semibold">{col.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{col.type}</TableCell>
                      <TableCell className="text-xs">
                        {col.required
                          ? <span className="text-destructive font-medium">Yes</span>
                          : <span className="text-muted-foreground">No</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{col.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">CSV example</p>
                <pre className="rounded-lg border bg-muted/40 text-xs p-3 overflow-x-auto leading-relaxed whitespace-pre text-foreground">
                  {g.csvExample}
                </pre>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">JSON example</p>
                <pre className="rounded-lg border bg-muted/40 text-xs p-3 overflow-x-auto leading-relaxed whitespace-pre text-foreground">
                  {g.jsonExample}
                </pre>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── File row ───────────────────────────────────────

function FileRow({
  entry,
  onRemove,
  onEntityChange,
}: {
  entry: FileEntry;
  onRemove: () => void;
  onEntityChange: (type: EntityType) => void;
}) {
  const validCount   = entry.parsed?.filter(r => r._valid).length  ?? 0;
  const invalidCount = entry.parsed?.filter(r => !r._valid).length ?? 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-foreground">{entry.file.name}</p>
        {entry.parseError && (
          <p className="text-[11px] text-destructive mt-0.5">{entry.parseError}</p>
        )}
        {entry.parsed && !entry.parseError && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {entry.parsed.length} rows
            {invalidCount > 0 && <span className="text-destructive ml-1">· {invalidCount} invalid</span>}
            {validCount   > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">· {validCount} valid</span>}
          </p>
        )}
        {entry.result && (
          <p className="text-[11px] mt-0.5 flex flex-wrap gap-x-2">
            <span className="text-emerald-600 dark:text-emerald-400">✓ {entry.result.succeeded} imported</span>
            {entry.result.sectionsCreated > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">· {entry.result.sectionsCreated} section{entry.result.sectionsCreated !== 1 ? "s" : ""}</span>
            )}
            {entry.result.failed > 0 && (
              <span className="text-destructive">✗ {entry.result.failed} failed</span>
            )}
          </p>
        )}
      </span>

      {(entry.status === "ready" || entry.status === "error") ? (
        <Select value={entry.entityType ?? ""} onValueChange={v => onEntityChange(v as EntityType)}>
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="colleges">Colleges</SelectItem>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="departments">Departments</SelectItem>
            <SelectItem value="courses">Courses</SelectItem>
          </SelectContent>
        </Select>
      ) : entry.entityType ? (
        <EntityBadge type={entry.entityType} />
      ) : null}

      {entry.status === "importing" && (
        <span className="text-[11px] text-muted-foreground animate-pulse">Importing…</span>
      )}
      {entry.status === "done" && (
        <span className="text-emerald-600 dark:text-emerald-400"><CheckIcon /></span>
      )}

      {(entry.status === "ready" || entry.status === "error") && (
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove file">
          <XIcon />
        </Button>
      )}
    </div>
  );
}

// ── Preview tables ─────────────────────────────────

function CoursePreviewTable({ rows }: { rows: ValidatedRow[] }) {
  const preview = rows.slice(0, 12);
  const seenCodes = new Set<string>();
  const rowMeta = preview.map(row => {
    const code = str(row.data.code);
    const isSection = code !== "" && seenCodes.has(code);
    if (code) seenCodes.add(code);
    return { isSection };
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-6">#</TableHead>
            <TableHead className="text-xs font-mono">code</TableHead>
            <TableHead className="text-xs font-mono">name</TableHead>
            <TableHead className="text-xs font-mono">credits</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((row, i) => {
            const { isSection } = rowMeta[i];
            const d = row.data;

            if (Array.isArray(d.sections)) {
              return (
                <TableRow key={row._index} className={!row._valid ? "bg-destructive/5" : ""}>
                  <TableCell className="text-xs text-muted-foreground">{row._index + 1}</TableCell>
                  <TableCell className="text-xs font-mono font-semibold">{str(d.code)}</TableCell>
                  <TableCell className="text-xs font-mono">{str(d.name)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{str(d.credits) || "—"}</TableCell>
                  <TableCell><EntityBadge type="courses" /></TableCell>
                  <TableCell className="text-xs">
                    {row._valid
                      ? <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                      : <span className="text-destructive" title={row._errors.join(", ")}>{row._errors[0]}</span>}
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={row._index} className={cn(isSection && "bg-muted/40", !row._valid && "bg-destructive/5")}>
                <TableCell className="text-xs text-muted-foreground">{row._index + 1}</TableCell>
                <TableCell className="text-xs font-mono">
                  {isSection
                    ? <span className="text-muted-foreground pl-3">↳ {str(d.code)}</span>
                    : <span className="font-semibold">{str(d.code)}</span>}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-28 truncate">
                  {isSection ? "" : str(d.name)}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {isSection ? "" : (str(d.credits) || "—")}
                </TableCell>
                <TableCell>
                  {isSection
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Section</span>
                    : <EntityBadge type="courses" />}
                </TableCell>
                <TableCell className="text-xs">
                  {row._valid
                    ? <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                    : <span className="text-destructive" title={row._errors.join(", ")}>{row._errors[0]}</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length > 12 && (
        <p className="text-xs text-muted-foreground text-center py-2 border-t bg-muted/20">
          … and {rows.length - 12} more rows
        </p>
      )}
    </div>
  );
}

function PreviewTable({ rows, entity }: { rows: ValidatedRow[]; entity: EntityType }) {
  if (entity === "courses") return <CoursePreviewTable rows={rows} />;

  const cols = GUIDE[entity].columns.map(c => c.name);
  const preview = rows.slice(0, 8);

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-6">#</TableHead>
            {cols.map(c => <TableHead key={c} className="text-xs font-mono">{c}</TableHead>)}
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map(row => (
            <TableRow key={row._index} className={!row._valid ? "bg-destructive/5" : ""}>
              <TableCell className="text-xs text-muted-foreground">{row._index + 1}</TableCell>
              {cols.map(c => (
                <TableCell key={c} className="text-xs font-mono max-w-32 truncate">
                  {String(row.data[c] ?? "")}
                </TableCell>
              ))}
              <TableCell className="text-xs">
                {row._valid
                  ? <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                  : <span className="text-destructive" title={row._errors.join(", ")}>{row._errors[0]}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 8 && (
        <p className="text-xs text-muted-foreground text-center py-2 border-t bg-muted/20">
          … and {rows.length - 8} more rows
        </p>
      )}
    </div>
  );
}

// ── Import logic ───────────────────────────────────

async function importRows(
  rows: ValidatedRow[],
  entity: EntityType
): Promise<{ succeeded: number; sectionsCreated: number; failed: number; errors: string[] }> {
  let succeeded = 0, sectionsCreated = 0;
  const errors: string[] = [];
  const valid = rows.filter(r => r._valid);

  if (entity === "colleges") {
    for (const row of valid) {
      const d = row.data;
      try {
        const body: CreateCollegeRequest = {
          name: str(d.name),
          code: str(d.code).toUpperCase(),
          ...(d.description ? { description: str(d.description) } : {}),
        };
        await apiClient.post(API_ENDPOINTS.COLLEGES, body);
        succeeded++;
      } catch (err) {
        errors.push(`Row ${row._index + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  } else if (entity === "users") {
    for (const row of valid) {
      const d = row.data;
      try {
        const body: CreateUserRequest = {
          displayName: str(d.name),
          email: str(d.email).toLowerCase(),
          role: str(d.role).toLowerCase() as CreateUserRequest["role"],
        };
        await apiClient.post(API_ENDPOINTS.USERS, body);
        succeeded++;
      } catch (err) {
        errors.push(`Row ${row._index + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  } else if (entity === "departments") {
    for (const row of valid) {
      const d = row.data;
      try {
        const body: CreateDepartmentRequest = {
          name: str(d.name),
          code: str(d.code).toUpperCase(),
          ...(d.description ? { description: str(d.description) } : {}),
        };
        await apiClient.post(API_ENDPOINTS.DEPARTMENTS, body);
        succeeded++;
      } catch (err) {
        errors.push(`Row ${row._index + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  } else if (entity === "courses") {
    const groups = new Map<string, ValidatedRow[]>();
    for (const row of valid) {
      const code = str(row.data.code);
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code)!.push(row);
    }
    for (const [, group] of groups) {
      const d = group[0].data;
      try {
        const courseBody: CreateCourseRequest = {
          name: str(d.name),
          code: str(d.code),
          ...(d.credits && !isNaN(Number(d.credits)) ? { credits: Number(d.credits) } : {}),
          ...(d.departmentId ? { departmentId: str(d.departmentId) } : {}),
          ...(d.description ? { description: str(d.description) } : {}),
        };
        const res = await apiClient.post<Course>(API_ENDPOINTS.ADMIN_COURSES, courseBody);
        const courseId = (res as { data?: Course }).data?._id;
        succeeded++;
        if (courseId) {
          if (Array.isArray(d.sections)) {
            for (const sec of d.sections as Record<string, unknown>[]) {
              const sid = Number(sec.sectionId);
              const body: CreateSectionRequest = {
                ...(Number.isInteger(sid) && sid >= 10001 && sid <= 99999 ? { sectionId: sid } : {}),
                ...(sec.instructorId ? { instructorId: str(sec.instructorId) } : {}),
              };
              try {
                await apiClient.post(API_ENDPOINTS.ADMIN_COURSE_SECTIONS(courseId), body);
                sectionsCreated++;
              } catch (e) {
                errors.push(`${str(d.code)} section: ${e instanceof Error ? e.message : "Unknown error"}`);
              }
            }
          } else {
            for (const row of group) {
              const sid = Number(row.data.section_id);
              const hasSid = Number.isInteger(sid) && sid >= 10001 && sid <= 99999;
              if (!hasSid && !row.data.section_instructorId) continue;
              const body: CreateSectionRequest = {
                ...(hasSid ? { sectionId: sid } : {}),
                ...(row.data.section_instructorId ? { instructorId: str(row.data.section_instructorId) } : {}),
              };
              try {
                await apiClient.post(API_ENDPOINTS.ADMIN_COURSE_SECTIONS(courseId), body);
                sectionsCreated++;
              } catch (e) {
                errors.push(`${str(d.code)} row ${row._index + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
              }
            }
          }
        }
      } catch (err) {
        errors.push(`Course "${str(d.code)}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  }

  return { succeeded, sectionsCreated, failed: errors.length, errors };
}

// ── Main dialog ────────────────────────────────────

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToast: (msg: string, kind?: "success" | "info" | "error") => void;
}

export function BulkImportDialog({ open, onOpenChange, onToast }: BulkImportDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMainEl(document.getElementById("nx-main")); }, []);

  const addFiles = useCallback(async (incoming: File[]) => {
    let rejected = 0;
    const entries: FileEntry[] = [];
    for (const file of incoming) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "json") { rejected++; continue; }
      if (ext === "json") {
        const combined = await tryParseCombined(file);
        if (combined) { entries.push(...combined); continue; }
      }
      const lower = file.name.toLowerCase();
      const entityType: EntityType | null =
        lower.includes("college") ? "colleges" :
        lower.includes("user") ? "users" :
        lower.includes("dept") || lower.includes("department") ? "departments" :
        lower.includes("course") ? "courses" : null;
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const { parsed, parseError } = await parseFile(file, entityType);
      entries.push({ id, file, entityType, parsed, parseError, status: "ready", result: null });
    }
    if (rejected > 0) onToast("Only .csv and .json files are supported.", "error");
    setFiles(prev => {
      const next = [...prev, ...entries];
      if (!selectedPreview && entries[0]) setSelectedPreview(entries[0].id);
      return next;
    });
  }, [onToast, selectedPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; }
  }, [addFiles]);

  const handleEntityChange = useCallback(async (id: string, entityType: EntityType) => {
    setFiles(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      const parsed = entry.parsed ? validateRows(entry.parsed.map(r => r.data), entityType) : null;
      return { ...entry, entityType, parsed };
    }));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(e => e.id !== id);
      if (selectedPreview === id) setSelectedPreview(next[0]?.id ?? null);
      return next;
    });
  }, [selectedPreview]);

  const canImport = files.some(e =>
    e.entityType && e.parsed?.some(r => r._valid) && (e.status === "ready" || e.status === "error")
  );

  const handleImport = useCallback(async () => {
    setImporting(true);
    let totalSucceeded = 0, totalSections = 0, totalFailed = 0;
    const updated = [...files];
    for (let i = 0; i < updated.length; i++) {
      const entry = updated[i];
      if (!entry.entityType || !entry.parsed || entry.status === "done") continue;
      updated[i] = { ...entry, status: "importing" };
      setFiles([...updated]);
      const result = await importRows(entry.parsed, entry.entityType);
      updated[i] = { ...updated[i], status: "done", result };
      setFiles([...updated]);
      totalSucceeded += result.succeeded;
      totalSections  += result.sectionsCreated;
      totalFailed    += result.failed;
    }
    setImporting(false);
    const sectionNote = totalSections > 0 ? ` + ${totalSections} section${totalSections !== 1 ? "s" : ""}` : "";
    if (totalSucceeded > 0 && totalFailed === 0)
      onToast(`${totalSucceeded} record${totalSucceeded !== 1 ? "s" : ""}${sectionNote} imported successfully.`, "success");
    else if (totalSucceeded > 0)
      onToast(`${totalSucceeded}${sectionNote} imported, ${totalFailed} failed.`, "error");
    else
      onToast("Import failed. Check file formats and try again.", "error");
  }, [files, onToast]);

  const previewEntry = files.find(e => e.id === selectedPreview);

  const handleClose = (o: boolean) => {
    if (!importing) { if (!o) setFiles([]); onOpenChange(o); }
  };

  const summaryText = (() => {
    if (files.length === 0) return "No files added yet.";
    const parts: string[] = [];
    let courses = 0, sections = 0, others = 0;
    for (const e of files) {
      if (!e.parsed) continue;
      const valid = e.parsed.filter(r => r._valid);
      if (e.entityType === "courses") {
        const codes = new Set(valid.map(r => str(r.data.code)));
        courses += codes.size;
        for (const r of valid) {
          if (Array.isArray(r.data.sections)) sections += (r.data.sections as unknown[]).length;
          else if (Number(r.data.section_id) > 0 || r.data.section_instructorId) sections++;
        }
      } else { others += valid.length; }
    }
    parts.push(`${files.length} file${files.length !== 1 ? "s" : ""}`);
    if (courses > 0) parts.push(`${courses} course${courses !== 1 ? "s" : ""}${sections > 0 ? `, ${sections} section${sections !== 1 ? "s" : ""}` : ""}`);
    if (others  > 0) parts.push(`${others} record${others !== 1 ? "s" : ""}`);
    return parts.join(" · ");
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal container={mainEl ?? undefined}>
        <DialogOverlay className="absolute inset-0 z-40 bg-black/50 duration-100" />
        <DialogPrimitive.Content
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "max-w-3xl w-full h-[88vh] flex flex-col overflow-hidden",
            "bg-background border border-border rounded-xl outline-none",
            "shadow-xl duration-100",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          )}
        >

          {/* ── Header ── */}
          <div className="flex-none flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b">
            <div>
              <DialogTitle className="text-sm font-semibold">Bulk Import</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Import colleges, departments, users, and courses — CSV or JSON.</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="upload" className="flex flex-col flex-1 min-h-0 gap-0">

            {/* Tab bar */}
            <div className="flex-none border-b bg-muted/20 px-6">
              <TabsList className="h-auto bg-transparent rounded-none border-0 p-0 gap-0">
                {(["upload", "guide"] as const).map(v => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className={cn(
                      "rounded-none bg-transparent px-3 py-3 text-xs font-medium -mb-px",
                      "border-b-2 border-transparent text-muted-foreground",
                      "hover:text-foreground transition-colors",
                      "data-active:border-foreground data-active:text-foreground",
                      "data-active:bg-transparent dark:data-active:bg-transparent dark:data-active:border-foreground",
                      "data-active:shadow-none"
                    )}
                  >
                    {v === "upload" ? "Upload" : "Format guide"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Upload tab ── */}
            <TabsContent value="upload" className="flex-1 overflow-y-auto min-h-0 px-6 py-5 flex flex-col gap-4">

              {/* Drop zone */}
              {files.length === 0 ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-14 cursor-pointer transition-colors",
                    dragging
                      ? "border-primary/60 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <span className="text-muted-foreground"><UploadCloud /></span>
                  <p className="text-sm font-medium text-foreground">
                    Drop files here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">.csv or .json · multiple files allowed</p>
                  <input ref={fileInputRef} type="file" multiple accept=".csv,.json" className="hidden" onChange={handleFileInput} />
                </div>
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-colors",
                    dragging
                      ? "border-primary/60 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <span className="text-muted-foreground"><UploadSmall /></span>
                  <span className="text-xs text-muted-foreground">
                    Drop more files or <span className="text-primary">browse</span>
                  </span>
                  <input ref={fileInputRef} type="file" multiple accept=".csv,.json" className="hidden" onChange={handleFileInput} />
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {files.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedPreview(entry.id)}
                      className={cn(
                        "rounded-lg border cursor-pointer transition-all",
                        selectedPreview === entry.id
                          ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-muted/20"
                      )}
                    >
                      <FileRow
                        entry={entry}
                        onRemove={() => removeFile(entry.id)}
                        onEntityChange={type => handleEntityChange(entry.id, type)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Inline preview */}
              {previewEntry?.parsed && previewEntry.entityType && !previewEntry.parseError && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs text-muted-foreground font-medium">Preview</span>
                    <ChevronRight />
                    <EntityBadge type={previewEntry.entityType} />
                  </div>
                  <PreviewTable rows={previewEntry.parsed} entity={previewEntry.entityType} />
                </div>
              )}
            </TabsContent>

            {/* ── Guide tab ── */}
            <TabsContent value="guide" className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
              <FormatGuide />
            </TabsContent>
          </Tabs>

          {/* ── Footer ── */}
          <div className="flex-none flex items-center justify-between gap-4 px-6 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground truncate">{summaryText}</p>
            <div className="flex gap-2 flex-none">
              <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={importing}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleImport} disabled={!canImport || importing}>
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>

        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

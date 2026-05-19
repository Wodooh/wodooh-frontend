"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useChairmanCourse } from "@/lib/hooks/use-chairman";

export default function ChairmanCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id ?? "";
  const { data, loading, error } = useChairmanCourse(courseId);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">{loading ? "Course…" : data?.course?.name ?? "Course"}</h1>
          <p className="nx-page-sub">
            <Link href="/chairman/department" style={{ color: "var(--nx-fg-muted)" }}>← Back to department</Link>
            {data?.course?.code ? <> · {data.course.code}</> : null}
          </p>
        </div>
      </div>

      {error ? <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>{error}</div> : null}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Sections</h3>
            <p className="nx-card-sub">{(data?.sections ?? []).length} section(s)</p>
          </div>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col">Instructor</th>
                <th scope="col">Email</th>
                <th scope="col">Students</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sections ?? []).length === 0 ? (
                <tr><td colSpan={4} style={{ color: "var(--nx-fg-muted)" }}>No sections.</td></tr>
              ) : (data?.sections ?? []).map(s => {
                const instr = s.instructorId && typeof s.instructorId !== "string" ? s.instructorId : null;
                return (
                  <tr key={s._id}>
                    <td className="nx-tbl-mono">{s.sectionId}</td>
                    <td>{instr?.name ?? "—"}</td>
                    <td className="nx-tbl-mono">{instr?.email ?? "—"}</td>
                    <td className="nx-tbl-mono">{s.studentCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Enrolled students</h3>
            <p className="nx-card-sub">
              {(data?.students ?? []).length} student(s) — anonymous handles; click to reveal via the audited flow.
            </p>
          </div>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Anonymous ID</th>
                <th scope="col">Sections in course</th>
                <th scope="col" style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.students ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ color: "var(--nx-fg-muted)" }}>No students enrolled.</td></tr>
              ) : (data?.students ?? []).map(s => (
                <tr key={s.anonymousCourseId}>
                  <td className="nx-tbl-mono">{s.anonymousCourseId}</td>
                  <td className="nx-tbl-mono">{s.sectionCount}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="nx-btn nx-btn-ghost"
                      onClick={() => router.push(`/chairman/students?anonymousCourseId=${encodeURIComponent(s.anonymousCourseId)}`)}
                    >
                      Reveal identity
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

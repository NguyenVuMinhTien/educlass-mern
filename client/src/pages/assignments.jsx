import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { call, formBody, query, useData } from "../api.js";
import { useAuth } from "../auth.jsx";
import {
  assignmentStatus,
  DataState,
  Download,
  Editor,
  Empty,
  PageTitle,
  Pagination,
  Status,
  formatDate,
  useFeedback,
} from "../ui.jsx";

export function StudentAssignmentList({ results = false }) {
  const data = useData("/dashboard/student");
  return (
    <>
      <PageTitle
        label="Không gian sinh viên"
        title={results ? "Kết quả học tập" : "Bài tập"}
      >
        {results
          ? "Điểm và nhận xét được công bố bởi giảng viên."
          : "Theo dõi hạn và trạng thái nộp bài trong các lớp đã ghi danh."}
      </PageTitle>
      <DataState state={data}>
        {(report) => {
          const rows = results
            ? report.assignments.filter((row) => row.submission?.published)
            : report.assignments;
          return (
            <section className="panel list-panel">
              {rows.length ? (
                rows.map((row) => {
                  const [status, label] = assignmentStatus(row);
                  return (
                    <Link
                      className="list-row"
                      key={row._id}
                      to={"/app/bai-tap/" + row._id}
                    >
                      <span className="list-icon">
                        {results ? (
                          <ClipboardCheck size={18} />
                        ) : (
                          <ClipboardList size={18} />
                        )}
                      </span>
                      <div className="list-text">
                        <strong>{row.title}</strong>
                        <small>
                          {row.courseTitle} · {formatDate(row.dueDate)}
                        </small>
                      </div>
                      <Status value={status}>
                        {results
                          ? row.submission.score + " / " + row.maxScore
                          : label}
                      </Status>
                      <ArrowRight size={17} />
                    </Link>
                  );
                })
              ) : (
                <Empty
                  title={
                    results ? "Chưa có điểm được công bố" : "Chưa có bài tập"
                  }
                />
              )}
            </section>
          );
        }}
      </DataState>
    </>
  );
}
export function AssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const detail = useData("/assignments/" + id, version);
  const teacher = user.role === "teacher";
  return (
    <DataState state={detail}>
      {(assignment) => (
        <>
          <Link
            className="back-link"
            to={"/app/khoa-hoc/" + assignment.courseId + "?tab=assignments"}
          >
            ‹ Bài tập của lớp
          </Link>
          <PageTitle label={assignment.courseTitle} title={assignment.title}>
            Hạn nộp {formatDate(assignment.dueDate)} · Tối đa{" "}
            {assignment.maxScore} điểm
          </PageTitle>
          <section className="panel assignment-description">
            <h2>
              <FileText size={21} /> Yêu cầu bài làm
            </h2>
            <p className="preserve">{assignment.description}</p>
            {assignment.file && (
              <Download path={"/assignments/" + id + "/download"}>
                Tải tài liệu hướng dẫn
              </Download>
            )}
            <div className="assignment-policy">
              <CalendarClock size={17} />
              {assignment.allowLateSubmission
                ? "Cho phép nộp lần đầu sau hạn."
                : "Bài tập đóng nộp khi đến hạn."}
            </div>
          </section>
          {teacher ? (
            <Gradebook key={id} assignment={assignment} />
          ) : (
            <StudentSubmission
              key={id}
              assignment={assignment}
              refresh={() => setVersion((value) => value + 1)}
            />
          )}
        </>
      )}
    </DataState>
  );
}
function StudentSubmission({ assignment, refresh }) {
  const [editing, setEditing] = useState(false);
  const { notify } = useFeedback();
  const submission = assignment.submission;
  const beforeDue = new Date(assignment.dueDate) >= new Date();
  const canSubmit =
    assignment.courseStatus === "open" &&
    (submission
      ? !submission.published && beforeDue
      : beforeDue || assignment.allowLateSubmission);
  const [status, label] = assignmentStatus(assignment);
  const fields = [
    {
      name: "textContent",
      label: "Nội dung bài làm",
      type: "textarea",
      maxLength: 16000,
    },
    {
      name: "file",
      label: "Tệp bài làm",
      type: "file",
      accept: ".pdf,.txt,application/pdf,text/plain",
      help: "PDF hoặc TXT, tối đa 8 MB.",
    },
    {
      name: "removeFile",
      label: "Gỡ tệp đã nộp",
      type: "checkbox",
      show: () => Boolean(submission?.file),
    },
  ];
  return (
    <section className="panel detail-panel">
      <div className="split panel-title">
        <h2>Bài nộp của tôi</h2>
        <Status value={status}>{label}</Status>
      </div>
      {submission ? (
        <div className="submission-body">
          <p className="muted">Nộp lúc {formatDate(submission.submittedAt)}</p>
          {submission.textContent && (
            <p className="preserve">{submission.textContent}</p>
          )}
          {submission.file && (
            <Download path={"/submissions/" + submission._id + "/download"}>
              {submission.file.originalName}
            </Download>
          )}
          {submission.published && (
            <div className="grade-result">
              <span>Điểm đã công bố</span>
              <strong>
                {submission.score} / {assignment.maxScore}
              </strong>
              {submission.feedback && (
                <p className="preserve">{submission.feedback}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="muted">Bạn chưa nộp bài tập này.</p>
      )}
      {canSubmit && (
        <button
          className="button primary mt-4"
          onClick={() => setEditing(true)}
        >
          {submission ? "Cập nhật bài nộp" : "Nộp bài tập"}
          <ArrowRight size={16} />
        </button>
      )}
      {editing && (
        <Editor
          title={submission ? "Cập nhật bài nộp" : "Nộp bài tập"}
          fields={fields}
          close={() => setEditing(false)}
          initial={{ textContent: submission?.textContent || "" }}
          submitLabel={submission ? "Lưu bài nộp" : "Gửi bài nộp"}
          save={async (value) => {
            const path = submission
              ? "/submissions/" + submission._id
              : "/assignments/" + assignment._id + "/submissions";
            await call(submission ? "PATCH" : "POST", path, formBody(value));
            notify(submission ? "Đã cập nhật bài nộp." : "Đã nộp bài tập.");
            refresh();
          }}
        />
      )}
    </section>
  );
}
function Gradebook({ assignment }) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("grade");
  const data = useData(
    query("/assignments/" + assignment._id + "/submissions", { page }),
    version,
  );
  const { notify } = useFeedback();
  const fields = [
    {
      name: "score",
      label: "Điểm / " + assignment.maxScore,
      type: "number",
      min: 0,
      max: assignment.maxScore,
      step: 0.01,
      required: true,
    },
    { name: "feedback", label: "Nhận xét", type: "textarea", maxLength: 4000 },
    {
      name: "published",
      label: "Công bố điểm cho sinh viên",
      type: "checkbox",
    },
  ];
  return (
    <section className="panel detail-panel">
      <div className="panel-title">
        <h2>Bài nộp để chấm</h2>
      </div>
      <DataState state={data}>
        {(result) => {
          const selected = result.items.find((row) => row._id === selectedId);
          return (
            <>
              {result.items.length ? (
                result.items.map((row) => (
                  <div className="grade-row" key={row._id}>
                    <div className="split">
                      <div>
                        <h3>{row.studentId?.fullName}</h3>
                        <p className="muted">
                          {row.studentId?.email} · {formatDate(row.submittedAt)}
                        </p>
                      </div>
                      <Status
                        value={
                          row.published
                            ? "graded"
                            : row.isLate
                              ? "late"
                              : "draft"
                        }
                      >
                        {row.published
                          ? "Đã công bố"
                          : row.isLate
                            ? "Nộp trễ"
                            : "Đúng hạn"}
                      </Status>
                    </div>
                    {row.textContent && (
                      <p className="preserve">{row.textContent}</p>
                    )}
                    <div className="split inline-actions">
                      {row.file && (
                        <Download
                          path={"/submissions/" + row._id + "/download"}
                        >
                          {row.file.originalName}
                        </Download>
                      )}
                      <button
                        className="button secondary compact"
                        onClick={() => setParams({ grade: row._id })}
                      >
                        {row.score === null
                          ? "Chấm điểm"
                          : "Sửa điểm " + row.score + "/" + assignment.maxScore}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <Empty title="Chưa có bài nộp" />
              )}
              <Pagination data={result} setPage={setPage} />
              {selected && (
                <Editor
                  title={"Chấm điểm · " + selected.studentId?.fullName}
                  close={() => setParams({})}
                  fields={fields}
                  initial={{
                    score: selected.score,
                    feedback: selected.feedback || "",
                    published: selected.published,
                  }}
                  submitLabel="Lưu điểm"
                  save={async (value) => {
                    await call(
                      "PATCH",
                      "/submissions/" + selected._id + "/grade",
                      { ...value, published: Boolean(value.published) },
                    );
                    notify(
                      value.published
                        ? "Đã công bố điểm."
                        : "Đã lưu điểm nháp.",
                    );
                    setVersion((current) => current + 1);
                  }}
                />
              )}
            </>
          );
        }}
      </DataState>
    </section>
  );
}

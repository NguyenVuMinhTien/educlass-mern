import { useState } from "react";
import {
  BookOpen,
  Check,
  ClipboardList,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { call, fileUrl, formBody, query, useData } from "../api.js";
import {
  assignmentStatus,
  CourseCard,
  DataState,
  Dialog,
  Download,
  Editor,
  Empty,
  Field,
  PageTitle,
  Pagination,
  Progress,
  Status,
  formatDate,
  labels,
  useFeedback,
} from "../ui.jsx";
import { courseStatuses } from "./admin.jsx";

const courseFields = [
  {
    name: "title",
    label: "Tên khóa học",
    required: true,
    minLength: 3,
    maxLength: 130,
  },
  {
    name: "courseCode",
    label: "Mã khóa học",
    required: true,
    minLength: 3,
    maxLength: 24,
    pattern: "[A-Za-z0-9\\-]+",
  },
  {
    name: "description",
    label: "Mô tả khóa học",
    type: "textarea",
    required: true,
    minLength: 8,
    maxLength: 5000,
  },
  { name: "category", label: "Danh mục", required: true, maxLength: 80 },
  {
    name: "thumbnail",
    label: "Liên kết ảnh đại diện",
    type: "url",
    maxLength: 1000,
  },
  {
    name: "status",
    label: "Trạng thái",
    type: "select",
    options: courseStatuses.map((value) => [value, labels[value]]),
  },
];
const directories = {
  materials: [
    "Quản lý học liệu",
    "Chọn lớp để thêm và quản lý tài liệu.",
    "materials",
  ],
  assignments: [
    "Quản lý bài tập",
    "Chọn lớp để xem và giao bài tập.",
    "assignments",
  ],
  students: [
    "Sinh viên ghi danh",
    "Chọn lớp để xem sinh viên và tiến độ.",
    "students",
  ],
  grading: [
    "Chấm điểm",
    "Chọn lớp, sau đó mở bài tập để xem và chấm bài nộp.",
    "assignments",
  ],
};
export function CourseDirectory({ section }) {
  const directory = directories[section];
  const { user } = useAuth();
  const teacher = user.role === "teacher";
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const data = useData(
    query(teacher ? "/teacher/courses" : "/student/enrollments", { page }),
  );
  return (
    <>
      <PageTitle
        label="Không gian lớp học"
        title={directory?.[0] || "Khóa học của tôi"}
        action={
          teacher &&
          !directory && (
            <button
              className="button primary"
              onClick={() => setParams({ new: "1" })}
            >
              <Plus size={18} />
              Tạo khóa học
            </button>
          )
        }
      >
        {directory?.[1] ||
          (teacher
            ? "Mở một lớp mới hoặc quản lý học liệu và bài tập của lớp hiện có."
            : "Tiếp tục những khóa học bạn đã ghi danh.")}
      </PageTitle>
      <DataState state={data}>
        {(result) => (
          <>
            {result.items.length ? (
              <div className="course-grid">
                {result.items.map((row) => {
                  const course = teacher ? row : row.courseId;
                  return (
                    <CourseCard
                      key={row._id}
                      course={course}
                      to={
                        "/app/khoa-hoc/" +
                        course._id +
                        (directory ? "?tab=" + directory[2] : "")
                      }
                      progress={row.progress}
                    />
                  );
                })}
              </div>
            ) : (
              <Empty title="Chưa có khóa học">
                {!teacher && (
                  <Link to="/app/kham-pha" className="text-link">
                    Tìm khóa học đang mở
                  </Link>
                )}
              </Empty>
            )}
            <Pagination data={result} setPage={setPage} />
          </>
        )}
      </DataState>
      {teacher && params.has("new") && (
        <Editor
          title="Tạo khóa học"
          close={(course) =>
            course?._id
              ? navigate("/app/khoa-hoc/" + course._id)
              : setParams({})
          }
          fields={courseFields}
          initial={{ status: "draft" }}
          submitLabel="Tạo khóa học"
          save={async (data) => {
            const course = await call("POST", "/courses", data);
            feedback.notify("Đã tạo khóa học.");
            return course;
          }}
        />
      )}
    </>
  );
}
const tabs = [
  ["overview", "Tổng quan"],
  ["learn", "Nội dung học tập"],
  ["materials", "Tài liệu"],
  ["assignments", "Bài tập"],
  ["students", "Sinh viên"],
  ["results", "Kết quả học tập"],
];
export function CourseWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const teacher = user.role === "teacher";
  const allowedTabs = teacher
    ? tabs
    : tabs.filter(([name]) => name !== "students");
  const requested = params.get("tab");
  const tab = allowedTabs.some(([key]) => key === requested)
    ? requested
    : "overview";
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const data = useData("/courses/" + id, version);
  const navigate = useNavigate();
  const { confirm, notify } = useFeedback();
  function remove(course) {
    confirm({
      title: "Xóa bản nháp",
      message: "Xóa “" + course.title + "” khỏi danh sách lớp của bạn?",
      label: "Xóa bản nháp",
      danger: true,
      run: async () => {
        await call("DELETE", "/courses/" + id);
        notify("Đã xóa bản nháp.");
        navigate("/app/khoa-hoc");
      },
    });
  }
  return (
    <>
      <Link className="back-link" to="/app/khoa-hoc">
        ‹ Khóa học của tôi
      </Link>
      <DataState state={data}>
        {(course) =>
          teacher && course.teacherId?._id !== user._id ? (
            <Empty title="Khóa học thuộc giảng viên khác">
              <Link className="text-link" to={"/khoa-hoc/" + id}>
                Xem trang giới thiệu
              </Link>
            </Empty>
          ) : (
            <>
              <PageTitle
                label={course.category + " · " + course.courseCode}
                title={course.title}
                action={
                  teacher &&
                  !course.moderated && (
                    <button
                      className="button secondary"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil size={17} /> Sửa khóa học
                    </button>
                  )
                }
              >
                {course.teacherId?.fullName}
              </PageTitle>
              {!teacher && !course.enrolled ? (
                <Empty title="Bạn chưa ghi danh lớp này">
                  <Link className="text-link" to={"/khoa-hoc/" + id}>
                    Xem trang giới thiệu
                  </Link>
                </Empty>
              ) : (
                <>
                  <nav className="tabs" aria-label="Nội dung khóa học">
                    {allowedTabs.map(([key, label]) => (
                      <Link
                        key={key}
                        to={"?tab=" + key}
                        aria-current={tab === key ? "page" : undefined}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                  {tab === "overview" && (
                    <section className="panel narrow-panel">
                      <div className="split">
                        <h2>Giới thiệu khóa học</h2>
                        <Status value={course.status} />
                      </div>
                      <p className="preserve">{course.description}</p>
                      <dl className="details">
                        <div>
                          <dt>Mã khóa học</dt>
                          <dd>{course.courseCode}</dd>
                        </div>
                        <div>
                          <dt>Bài học</dt>
                          <dd>{course.lessonCount}</dd>
                        </div>
                      </dl>
                      {teacher &&
                        course.status === "draft" &&
                        !course.moderated && (
                          <button
                            className="button danger compact"
                            onClick={() => remove(course)}
                          >
                            <Trash2 size={16} /> Xóa bản nháp
                          </button>
                        )}
                    </section>
                  )}
                  {tab === "learn" && (
                    <Lessons key={id} id={id} teacher={teacher} />
                  )}
                  {tab === "materials" && (
                    <Materials key={id} id={id} teacher={teacher} />
                  )}
                  {tab === "assignments" && (
                    <CourseAssignments key={id} id={id} teacher={teacher} />
                  )}
                  {tab === "results" &&
                    (teacher ? (
                      <Roster key={id} id={id} results />
                    ) : (
                      <CourseAssignments key={id} id={id} results />
                    ))}
                  {tab === "students" && <Roster key={id} id={id} />}
                </>
              )}
              {editing && (
                <Editor
                  title="Cập nhật khóa học"
                  close={() => setEditing(false)}
                  fields={courseFields}
                  initial={course}
                  save={async (fields) => {
                    await call("PATCH", "/courses/" + id, {
                      ...fields,
                      thumbnail: fields.thumbnail || "",
                    });
                    setVersion((value) => value + 1);
                    notify("Đã cập nhật khóa học.");
                  }}
                />
              )}
            </>
          )
        }
      </DataState>
    </>
  );
}
function useCollection(url, resource, noun) {
  const [version, setVersion] = useState(0);
  const [editor, setEditor] = useState(null);
  const state = useData(url, version);
  const { notify, confirm } = useFeedback();
  const refresh = () => setVersion((value) => value + 1);
  function remove(row) {
    confirm({
      title: "Xóa " + noun,
      message: "Xác nhận xóa “" + row.title + "”?",
      danger: true,
      label: "Xóa " + noun,
      run: async () => {
        await call("DELETE", "/" + resource + "/" + row._id);
        refresh();
        notify("Đã xóa " + noun + ".");
      },
    });
  }
  async function save(row, transform = (value) => value) {
    const editing = !!editor._id;
    await call(
      editing ? "PATCH" : "POST",
      editing ? "/" + resource + "/" + editor._id : url,
      transform(row),
    );
    refresh();
    notify(editing ? "Đã lưu thay đổi." : "Đã thêm " + noun + ".");
  }
  return { state, editor, setEditor, remove, save, refresh, notify };
}
const lessonFields = [
  { name: "title", label: "Tên bài học", required: true, maxLength: 130 },
  {
    name: "order",
    label: "Thứ tự hiển thị",
    type: "number",
    required: true,
    min: 1,
    max: 9999,
  },
  {
    name: "content",
    label: "Nội dung bài học",
    type: "textarea",
    required: true,
    maxLength: 16000,
  },
];
function RowActions({ rows, item, noun }) {
  return (
    <div className="inline-actions">
      <button
        className="icon-button"
        aria-label={"Sửa " + noun + " " + item.title}
        onClick={() => rows.setEditor(item)}
      >
        <Pencil size={17} />
      </button>
      <button
        className="icon-button"
        aria-label={"Xóa " + noun + " " + item.title}
        onClick={() => rows.remove(item)}
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}
function Lessons({ id, teacher }) {
  const rows = useCollection(
    "/courses/" + id + "/lessons",
    "lessons",
    "bài học",
  );
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  async function complete(lesson) {
    setBusy(true);
    try {
      await call("POST", "/lessons/" + lesson._id + "/complete");
      rows.refresh();
      rows.notify("Đã đánh dấu hoàn thành.");
    } catch (error) {
      rows.notify(
        error.response?.data?.message || "Không thể lưu tiến độ.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel detail-panel">
      <div className="split panel-title">
        <h2>Nội dung học tập</h2>
        {teacher && (
          <button
            className="button primary compact"
            onClick={() =>
              rows.setEditor({
                order: (rows.state.data?.lessons.at(-1)?.order || 0) + 1,
              })
            }
          >
            <Plus size={17} />
            Thêm bài học
          </button>
        )}
      </div>
      <DataState state={rows.state}>
        {({ lessons, completedLessonIds }) => {
          const current =
            lessons.find((lesson) => lesson._id === active) || lessons[0];
          const finished = current && completedLessonIds.includes(current._id);
          return current ? (
            <div className="lesson-layout">
              <div className="lesson-side">
                {lessons.map((lesson) => (
                  <button
                    key={lesson._id}
                    className={
                      "lesson-link" +
                      (current._id === lesson._id ? " chosen" : "")
                    }
                    onClick={() => setActive(lesson._id)}
                  >
                    {completedLessonIds.includes(lesson._id) ? (
                      <Check size={17} />
                    ) : (
                      <BookOpen size={17} />
                    )}
                    <span>
                      {lesson.order}. {lesson.title}
                    </span>
                  </button>
                ))}
              </div>
              <article className="lesson-body">
                <div className="split">
                  <h3>{current.title}</h3>
                  {teacher && (
                    <RowActions rows={rows} item={current} noun="bài học" />
                  )}
                </div>
                <p className="preserve">{current.content}</p>
                {!teacher && (
                  <button
                    className="button primary compact"
                    disabled={busy || finished}
                    onClick={() => complete(current)}
                  >
                    <Check size={17} />
                    {finished ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </button>
                )}
              </article>
            </div>
          ) : (
            <Empty title="Chưa có bài học" />
          );
        }}
      </DataState>
      {rows.editor && (
        <Editor
          title={rows.editor._id ? "Sửa bài học" : "Thêm bài học"}
          close={() => rows.setEditor(null)}
          fields={lessonFields}
          initial={rows.editor}
          save={rows.save}
        />
      )}
    </section>
  );
}
const materialLabels = { pdf: "Tệp PDF", video: "Video", text: "Bài đọc" };
function Materials({ id, teacher }) {
  const rows = useCollection(
    "/courses/" + id + "/materials",
    "materials",
    "tài liệu",
  );
  const lessons = useData(teacher ? "/courses/" + id + "/lessons" : null);
  const [read, setRead] = useState(null);
  const fields = [
    { name: "title", label: "Tên tài liệu", required: true, maxLength: 130 },
    {
      name: "type",
      label: "Loại tài liệu",
      type: "select",
      options: Object.entries(materialLabels),
      required: true,
    },
    {
      name: "lessonId",
      label: "Bài học liên quan",
      type: "select",
      options: [
        ["", "Tài liệu chung"],
        ...(lessons.data?.lessons || []).map((lesson) => [
          lesson._id,
          lesson.title,
        ]),
      ],
    },
    {
      name: "file",
      label: "Tệp PDF",
      type: "file",
      accept: "application/pdf,.pdf",
      required: !rows.editor?.file,
      show: (value) => value.type === "pdf",
    },
    {
      name: "url",
      label: "Liên kết video HTTPS",
      type: "url",
      required: true,
      maxLength: 2000,
      show: (value) => value.type === "video",
    },
    {
      name: "content",
      label: "Nội dung bài đọc",
      type: "textarea",
      required: true,
      maxLength: 16000,
      show: (value) => value.type === "text",
    },
  ];
  return (
    <section className="panel detail-panel">
      <div className="split panel-title">
        <h2>Tài liệu học tập</h2>
        {teacher && (
          <button
            className="button primary compact"
            onClick={() => rows.setEditor({ type: "pdf" })}
          >
            <Plus size={17} />
            Thêm tài liệu
          </button>
        )}
      </div>
      <DataState state={rows.state}>
        {(items) =>
          items.length ? (
            items.map((item) => (
              <div className="list-row" key={item._id}>
                <span className="list-icon">
                  {item.type === "video" ? (
                    <Video size={18} />
                  ) : (
                    <FileText size={18} />
                  )}
                </span>
                <div className="list-text">
                  <strong>{item.title}</strong>
                  <small>
                    {materialLabels[item.type]}
                    {item.file ? " · " + item.file.originalName : ""}
                  </small>
                </div>
                <div className="inline-actions">
                  {item.type === "video" ? (
                    <a
                      className="button secondary compact"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở video
                    </a>
                  ) : (
                    <button
                      className="button secondary compact"
                      onClick={() => setRead(item)}
                    >
                      {item.type === "pdf" ? "Xem trước" : "Đọc tài liệu"}
                    </button>
                  )}
                  {item.file && (
                    <Download path={"/materials/" + item._id + "/download"} />
                  )}
                  {teacher && (
                    <RowActions rows={rows} item={item} noun="tài liệu" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <Empty title="Chưa có tài liệu" />
          )
        }
      </DataState>
      {read && (
        <Dialog title={read.title} close={() => setRead(null)}>
          {read.type === "pdf" ? (
            <>
              <iframe
                className="pdf-preview"
                title={read.title}
                src={fileUrl("/materials/" + read._id + "/download?preview=1")}
              />
              <div className="form-actions">
                <Download path={"/materials/" + read._id + "/download"} />
              </div>
            </>
          ) : (
            <p className="preserve">{read.content}</p>
          )}
        </Dialog>
      )}
      {rows.editor && (
        <Editor
          title={rows.editor._id ? "Sửa tài liệu" : "Thêm tài liệu"}
          close={() => rows.setEditor(null)}
          fields={fields}
          initial={{ ...rows.editor, file: undefined }}
          save={(value) =>
            rows.save(value, (fields) => {
              const { file, content, url, ...common } = fields;
              return formBody({
                ...common,
                file: fields.type === "pdf" ? file : undefined,
                content: fields.type === "text" ? content : undefined,
                url: fields.type === "video" ? url : undefined,
              });
            })
          }
        />
      )}
    </section>
  );
}
function localTime(date) {
  if (!date) return "";
  return new Date(new Date(date).getTime() + 7 * 3600_000)
    .toISOString()
    .slice(0, 16);
}
function CourseAssignments({ id, teacher = false, results = false }) {
  const rows = useCollection(
    "/courses/" + id + "/assignments",
    "assignments",
    "bài tập",
  );
  const fields = [
    { name: "title", label: "Tiêu đề bài tập", required: true, maxLength: 130 },
    {
      name: "description",
      label: "Yêu cầu bài làm",
      type: "textarea",
      required: true,
      maxLength: 8000,
    },
    {
      name: "dueDate",
      label: "Hạn nộp (giờ Việt Nam)",
      type: "datetime-local",
      required: true,
    },
    {
      name: "maxScore",
      label: "Điểm tối đa",
      type: "number",
      min: 1,
      max: 1000,
      step: 0.01,
      required: true,
      disabled: Boolean(rows.editor?._id),
    },
    {
      name: "allowLateSubmission",
      label: "Cho phép nộp lần đầu sau hạn",
      type: "checkbox",
    },
    {
      name: "file",
      label: "Tài liệu hướng dẫn PDF",
      type: "file",
      accept: "application/pdf,.pdf",
    },
    {
      name: "removeFile",
      label: "Gỡ tài liệu hướng dẫn hiện tại",
      type: "checkbox",
      show: () => Boolean(rows.editor?.file),
    },
  ];
  return (
    <section className="panel detail-panel">
      <div className="split panel-title">
        <h2>{results ? "Kết quả học tập" : "Bài tập của lớp"}</h2>
        {teacher && (
          <button
            className="button primary compact"
            onClick={() =>
              rows.setEditor({
                maxScore: 10,
                dueDate: localTime(Date.now() + 7 * 86400_000),
              })
            }
          >
            <Plus size={17} />
            Tạo bài tập
          </button>
        )}
      </div>
      <DataState state={rows.state}>
        {(items) => {
          const shown = results
            ? items.filter((item) => item.submission?.published)
            : items;
          return shown.length ? (
            shown.map((item) => {
              const [status, label] = assignmentStatus(item);
              return (
                <div className="list-row" key={item._id}>
                  <span className="list-icon">
                    <ClipboardList size={18} />
                  </span>
                  <div className="list-text">
                    <Link className="text-link" to={"/app/bai-tap/" + item._id}>
                      {item.title}
                    </Link>
                    <small>
                      Hạn {formatDate(item.dueDate)} · {item.maxScore} điểm
                      {teacher
                        ? " · " + item.submissionsCount + " bài nộp"
                        : ""}
                    </small>
                  </div>
                  {teacher ? (
                    <RowActions rows={rows} item={item} noun="bài tập" />
                  ) : (
                    <Status value={status}>
                      {results
                        ? item.submission.score + " / " + item.maxScore
                        : label}
                    </Status>
                  )}
                </div>
              );
            })
          ) : (
            <Empty
              title={results ? "Chưa có điểm được công bố" : "Chưa có bài tập"}
            />
          );
        }}
      </DataState>
      {rows.editor && (
        <Editor
          title={rows.editor._id ? "Sửa bài tập" : "Tạo bài tập"}
          close={() => rows.setEditor(null)}
          fields={fields}
          initial={{
            ...rows.editor,
            file: undefined,
            dueDate: rows.editor._id
              ? localTime(rows.editor.dueDate)
              : rows.editor.dueDate,
          }}
          save={(value) =>
            rows.save(value, (fields) =>
              formBody({ ...fields, dueDate: fields.dueDate + ":00+07:00" }),
            )
          }
        />
      )}
    </section>
  );
}
function Roster({ id, results = false }) {
  const [filters, setFilters] = useState({ page: 1, search: "" });
  const [input, setInput] = useState("");
  const data = useData(query("/courses/" + id + "/students", filters));
  return (
    <section className="panel detail-panel">
      <div className="panel-title">
        <h2>{results ? "Kết quả theo sinh viên" : "Sinh viên đã ghi danh"}</h2>
      </div>
      <form
        className="filters roster-filter"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ page: 1, search: input.trim() });
        }}
      >
        <Field label="Họ tên hoặc email">
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </Field>
        <button className="button primary">
          <Search size={17} /> Tìm sinh viên
        </button>
      </form>
      <DataState state={data}>
        {(result) => (
          <>
            {result.items.length ? (
              <div className="table-card">
                <table>
                  <caption>{result.total} sinh viên</caption>
                  <thead>
                    <tr>
                      <th>Sinh viên</th>
                      <th>Ghi danh</th>
                      <th>Tiến độ</th>
                      {results ? (
                        result.assignments.map((item) => (
                          <th key={item._id}>{item.title}</th>
                        ))
                      ) : (
                        <th>Bài đã nộp</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((row) => (
                      <tr key={row._id}>
                        <td>
                          <strong>{row.studentId?.fullName}</strong>
                          <small>{row.studentId?.email}</small>
                        </td>
                        <td>{formatDate(row.enrolledAt)}</td>
                        <td>
                          <Progress value={row.progress} />
                        </td>
                        {results ? (
                          result.assignments.map((item) => {
                            const submission = row.submissions.find(
                              (entry) => entry.assignmentId === item._id,
                            );
                            return (
                              <td key={item._id}>
                                {!submission
                                  ? "Chưa nộp"
                                  : submission.score === null
                                    ? "Chờ chấm"
                                    : submission.score +
                                      "/" +
                                      item.maxScore +
                                      (submission.published ? "" : " (nháp)")}
                              </td>
                            );
                          })
                        ) : (
                          <td>
                            {row.submissions.length}/{result.assignments.length}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Không tìm thấy sinh viên" />
            )}
            <Pagination
              data={result}
              setPage={(page) => setFilters((old) => ({ ...old, page }))}
            />
          </>
        )}
      </DataState>
    </section>
  );
}

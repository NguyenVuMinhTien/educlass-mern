import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  LoaderCircle,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { download, errorMessage } from "./api.js";

export const labels = {
  admin: "Quản trị viên",
  teacher: "Giảng viên",
  student: "Sinh viên",
  draft: "Bản nháp",
  open: "Đang mở",
  closed: "Đã đóng",
  archived: "Đã lưu trữ",
};
export const formatDate = (date) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Trang chủ EduClass">
      <span className="brand-mark">
        <GraduationCap size={22} />
      </span>
      EduClass<span className="brand-dot">.</span>
    </Link>
  );
}
export function Avatar({ name }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function Status({ value, children }) {
  return (
    <span className={"status status-" + value}>
      {children || labels[value]}
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle size={22} className="spin" />
      Đang tải dữ liệu…
    </div>
  );
}
export function Empty({ title = "Chưa có dữ liệu", children }) {
  return (
    <div className="state">
      <BookOpen size={23} />
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}
export function Problem({ error }) {
  return (
    <div className="problem" role="alert">
      <CircleAlert size={18} />
      {typeof error === "string" ? error : errorMessage(error)}
    </div>
  );
}
export function DataState({ state, children }) {
  if (state.loading) return <Loading />;
  if (state.error) return <Problem error={state.error} />;
  return state.data == null ? null : children(state.data);
}
export function PageTitle({ label, title, children, action }) {
  return (
    <header className="page-title" data-enter>
      <div>
        {label && <p className="eyebrow">{label}</p>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Progress({ value }) {
  return (
    <div className="progress-line" aria-label={"Tiến độ " + value + "%"}>
      <progress max="100" value={value} />
      <small>{value}%</small>
    </div>
  );
}
export function Pagination({ data, setPage }) {
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  if (pages === 1 && data.page === 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="icon-button"
        aria-label="Trang trước"
        disabled={data.page <= 1}
        onClick={() => setPage(data.page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <span>
        Trang {data.page} / {pages}
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label="Trang sau"
        disabled={data.page >= pages}
        onClick={() => setPage(data.page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
export function Field({ label, help, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-describedby": help ? id + "-help" : undefined,
      })}
      {help && <small id={id + "-help"}>{help}</small>}
    </div>
  );
}
export function Dialog({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    element.showModal();
    return () => {
      if (element.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Đóng hộp thoại"
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Editor({
  title,
  close,
  fields,
  initial = {},
  save,
  submitLabel = "Lưu thay đổi",
}) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await save(values);
      close(result);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={title}
      close={() => {
        if (!busy) close();
      }}
    >
      <form className="editor-form" onSubmit={submit}>
        {fields
          .filter((field) => !field.show || field.show(values))
          .map(({ name, label, type = "text", options, help, ...props }) => {
            delete props.show;
            const update = (value) =>
              setValues((old) => ({ ...old, [name]: value }));
            const shared = {
              ...props,
              value: values[name] ?? "",
              onChange: (event) => update(event.target.value),
            };
            if (type === "checkbox")
              return (
                <label className="check-field" key={name}>
                  <input
                    type="checkbox"
                    checked={Boolean(values[name])}
                    onChange={(event) => update(event.target.checked)}
                  />
                  {label}
                </label>
              );
            return (
              <Field label={label} key={name} help={help}>
                {type === "textarea" ? (
                  <textarea rows={4} {...shared} />
                ) : type === "select" ? (
                  <select {...shared}>
                    {options.map(([value, text]) => (
                      <option value={value} key={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                ) : type === "file" ? (
                  <input
                    type="file"
                    accept={props.accept}
                    required={props.required}
                    onChange={(event) => update(event.target.files[0])}
                  />
                ) : (
                  <input type={type} {...shared} />
                )}
              </Field>
            );
          })}
        {error && <Problem error={error} />}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={close}
            disabled={busy}
          >
            Hủy
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Đang lưu…" : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
const UiFeedback = createContext(null);
export function Feedback({ children }) {
  const [toast, setToast] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  function confirm(options) {
    setError(null);
    setConfirmation(options);
  }
  async function run() {
    setBusy(true);
    setError(null);
    try {
      await confirmation.run();
      setConfirmation(null);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const cancel = () => {
    if (!busy) setConfirmation(null);
  };
  return (
    <UiFeedback.Provider
      value={{
        notify: (text, bad = false) => setToast({ text, bad }),
        confirm,
      }}
    >
      {children}
      {toast && (
        <div
          className={"toast" + (toast.bad ? " bad" : "")}
          role={toast.bad ? "alert" : "status"}
        >
          {toast.bad ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
          {toast.text}
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {confirmation && (
        <Dialog title={confirmation.title} close={cancel}>
          <p className="dialog-copy">{confirmation.message}</p>
          {error && <Problem error={error} />}
          <div className="form-actions">
            <button
              disabled={busy}
              className="button secondary"
              onClick={cancel}
            >
              Hủy
            </button>
            <button
              disabled={busy}
              className={
                "button " + (confirmation.danger ? "danger" : "primary")
              }
              onClick={run}
            >
              {busy ? "Đang xử lý…" : confirmation.label}
            </button>
          </div>
        </Dialog>
      )}
    </UiFeedback.Provider>
  );
}
export const useFeedback = () => useContext(UiFeedback);
export function Download({ path, children = "Tải tệp" }) {
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await download(path);
    } catch (error) {
      feedback.notify(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      className="button secondary compact"
      disabled={busy}
      onClick={run}
    >
      <ArrowDownToLine size={16} />
      {children}
    </button>
  );
}
export function CourseCard({ course, to, progress }) {
  const tone =
    [...course.courseCode].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    4;
  return (
    <Link to={to} className="course-card card">
      <div className={"course-art tone-" + tone} data-visual>
        {course.thumbnail && (
          <img
            src={course.thumbnail}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        <span>
          <BookOpen size={19} /> {course.courseCode}
        </span>
        <div className="art-shape" aria-hidden="true" />
      </div>
      <div className="course-meta">
        <div className="split">
          <small>{course.category}</small>
          <Status value={course.status} />
        </div>
        <h3>{course.title}</h3>
        {course.teacherId?.fullName && <p>{course.teacherId.fullName}</p>}
        {progress !== undefined ? (
          <Progress value={progress} />
        ) : (
          <span className="card-link">
            Xem khóa học <ArrowRight size={16} />
          </span>
        )}
      </div>
    </Link>
  );
}
export function assignmentStatus(item) {
  if (item.submission?.published) return ["graded", "Đã chấm điểm"];
  if (item.submission)
    return item.submission.isLate
      ? ["late", "Nộp trễ"]
      : ["submitted", "Đã nộp"];
  if (new Date(item.dueDate) < new Date()) return ["late", "Quá hạn chưa nộp"];
  return ["draft", "Chưa nộp"];
}

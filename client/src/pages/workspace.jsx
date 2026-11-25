import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Compass,
  GraduationCap,
  House,
  LibraryBig,
  Lock,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { call, errorMessage, useData } from "../api.js";
import {
  Avatar,
  Brand,
  DataState,
  Empty,
  Field,
  PageTitle,
  Problem,
  Progress,
  Status,
  formatDate,
  labels,
  useFeedback,
} from "../ui.jsx";

const navigation = {
  admin: [
    ["/app/nguoi-dung", "Quản lý người dùng", Users],
    ["/app/danh-muc", "Quản lý khóa học", LibraryBig],
  ],
  teacher: [
    ["/app/khoa-hoc", "Khóa học của tôi", LibraryBig],
    ["/app/giang-vien/hoc-lieu", "Quản lý học liệu", BookOpen],
    ["/app/giang-vien/bai-tap", "Bài tập", ClipboardList],
    ["/app/giang-vien/sinh-vien", "Sinh viên", Users],
    ["/app/giang-vien/cham-diem", "Chấm điểm", CheckCheck],
  ],
  student: [
    ["/app/kham-pha", "Khám phá khóa học", Compass],
    ["/app/khoa-hoc", "Khóa học của tôi", LibraryBig],
    ["/app/bai-tap", "Bài tập", ClipboardList],
    ["/app/ket-qua", "Kết quả học tập", GraduationCap],
  ],
};
export function Shell() {
  const { user, signOut } = useAuth();
  const [drawerPath, setDrawerPath] = useState(null);
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const drawer = location.key === drawerPath;
  const navigate = useNavigate();
  const feedback = useFeedback();
  const sections = [
    ["/app", "Tổng quan", House],
    ...navigation[user.role],
    ["/app/tai-khoan", "Tài khoản", UserRound],
  ];
  useEffect(() => {
    if (!drawer) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDrawerPath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawer]);
  async function logout() {
    setBusy(true);
    try {
      await signOut();
      navigate("/dang-nhap", { replace: true });
    } catch (error) {
      feedback.notify(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={"workspace" + (drawer ? " drawer-open" : "")}>
      <button
        type="button"
        className="drawer-backdrop"
        aria-label="Đóng điều hướng"
        onClick={() => setDrawerPath(null)}
      />
      <aside className="sidebar" id="workspace-navigation">
        <div className="sidebar-brand">
          <Brand />
          <button
            type="button"
            className="icon-button drawer-close"
            aria-label="Đóng menu"
            onClick={() => setDrawerPath(null)}
          >
            <X size={21} />
          </button>
        </div>
        <p className="sidebar-label">
          Không gian {labels[user.role].toLowerCase()}
        </p>
        <nav aria-label="Điều hướng lớp học">
          {sections.map(([href, name, Icon]) => (
            <NavLink
              end={href === "/app" || href === "/app/bai-tap"}
              to={href}
              key={href}
            >
              <Icon size={19} />
              {name}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-base">
          <Link to="/app/tai-khoan" className="profile-chip">
            <Avatar name={user.fullName} />
            <div>
              <strong>{user.fullName}</strong>
              <small>{labels[user.role]}</small>
            </div>
          </Link>
          <button className="logout" onClick={logout} disabled={busy}>
            <LogOut size={17} /> {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </aside>
      <div className="work-area">
        <header className="work-header">
          <button
            className="icon-button drawer-toggle"
            aria-label="Mở menu"
            aria-expanded={drawer}
            aria-controls="workspace-navigation"
            onClick={() => setDrawerPath(location.key)}
          >
            <Menu size={22} />
          </button>
          <span className="workspace-label">Không gian lớp học</span>
          <Link
            className="avatar-link"
            to="/app/tai-khoan"
            aria-label="Tài khoản"
          >
            <Avatar name={user.fullName} />
          </Link>
        </header>
        <main id="main" className="work-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
const stats = {
  admin: [
    ["users", "Người dùng", Users],
    ["teachers", "Giảng viên", GraduationCap],
    ["students", "Sinh viên", UserRound],
    ["courses", "Khóa học", LibraryBig],
    ["openCourses", "Lớp đang mở", BookOpen],
    ["locked", "Tài khoản bị khóa", Lock],
  ],
  teacher: [
    ["courses", "Khóa học", LibraryBig],
    ["openCourses", "Lớp đang mở", BookOpen],
    ["students", "Sinh viên ghi danh", Users],
    ["assignments", "Bài tập", ClipboardList],
    ["ungraded", "Bài chờ chấm", CalendarClock],
  ],
  student: [
    ["enrolled", "Khóa đã ghi danh", LibraryBig],
    ["active", "Khóa đang học", BookOpen],
    ["todo", "Bài tập cần làm", CalendarClock],
    ["submitted", "Bài đã nộp", ClipboardList],
    ["graded", "Bài đã chấm", CheckCheck],
    ["progress", "Tiến độ trung bình", GraduationCap],
  ],
};
function DashboardCourse({ course, role, progress }) {
  const url =
    role === "admin"
      ? "/app/danh-muc?course=" + course._id
      : "/app/khoa-hoc/" + course._id;
  return (
    <Link to={url} className="list-row">
      <span className="list-icon">
        <BookOpen size={18} />
      </span>
      <div className="list-text">
        <strong>{course.title}</strong>
        <small>
          {course.courseCode} · {course.category}
        </small>
        {progress !== undefined && <Progress value={progress} />}
      </div>
      <Status value={course.status} />
      <ArrowRight size={17} />
    </Link>
  );
}
export function Dashboard() {
  const { user } = useAuth();
  const data = useData("/dashboard/" + user.role);
  const role = user.role;
  const action =
    role === "admin"
      ? ["/app/nguoi-dung", "Quản lý người dùng"]
      : role === "teacher"
        ? ["/app/khoa-hoc?new=1", "Tạo khóa học"]
        : ["/app/kham-pha", "Tìm khóa học"];
  return (
    <>
      <div className="dash-hero" data-enter>
        <div>
          <p className="eyebrow">{labels[role]} · Tổng quan</p>
          <h1>Xin chào, {user.fullName}.</h1>
          <p>
            {role === "admin"
              ? "Theo dõi tài khoản và khóa học trên toàn hệ thống."
              : role === "teacher"
                ? "Quản lý lớp học và theo dõi bài nộp của sinh viên."
                : "Tiếp tục bài học đang học và theo dõi hạn nộp bài."}
          </p>
        </div>
        <Link className="button inverse" to={action[0]}>
          {action[1]}
          <ArrowRight size={17} />
        </Link>
      </div>
      <DataState state={data}>
        {(result) => (
          <>
            <section className="stats-grid" aria-label="Số liệu tổng quan">
              {stats[role].map(([key, title, Icon]) => (
                <div key={key} className="stat">
                  <div>
                    <span>{title}</span>
                    <span className="stat-icon">
                      <Icon size={18} />
                    </span>
                  </div>
                  <strong>
                    {result[key]}
                    {key === "progress" ? "%" : ""}
                  </strong>
                </div>
              ))}
            </section>
            <div
              className={"dash-columns" + (role === "admin" ? " single" : "")}
            >
              <section className="panel list-panel">
                <div className="split panel-title">
                  <h2>
                    {role === "student"
                      ? "Khóa học của tôi"
                      : "Khóa học gần đây"}
                  </h2>
                  <Link
                    className="text-link"
                    to={role === "admin" ? "/app/danh-muc" : "/app/khoa-hoc"}
                  >
                    Xem danh sách <ArrowRight size={15} />
                  </Link>
                </div>
                {role === "student" ? (
                  result.courses.length ? (
                    result.courses.map((row) => (
                      <DashboardCourse
                        key={row._id}
                        role={role}
                        course={row.courseId}
                        progress={row.progress}
                      />
                    ))
                  ) : (
                    <Empty title="Bạn chưa ghi danh khóa học nào" />
                  )
                ) : result.recentCourses.length ? (
                  result.recentCourses.map((course) => (
                    <DashboardCourse
                      key={course._id}
                      role={role}
                      course={course}
                    />
                  ))
                ) : (
                  <Empty title="Chưa có khóa học" />
                )}
              </section>
              {role === "teacher" && (
                <section className="panel list-panel">
                  <div className="panel-title">
                    <h2>Bài nộp chờ chấm</h2>
                  </div>
                  {result.recentSubmissions.length ? (
                    result.recentSubmissions.map((row) => (
                      <Link
                        key={row._id}
                        to={
                          "/app/bai-tap/" +
                          row.assignmentId._id +
                          "?grade=" +
                          row._id
                        }
                        className="list-row"
                      >
                        <span className="list-icon">
                          <ClipboardList size={18} />
                        </span>
                        <div className="list-text">
                          <strong>{row.assignmentId.title}</strong>
                          <small>
                            {row.studentId?.fullName} ·{" "}
                            {formatDate(row.submittedAt)}
                          </small>
                        </div>
                        <ArrowRight size={17} />
                      </Link>
                    ))
                  ) : (
                    <Empty title="Bạn đã xử lý hết bài nộp" />
                  )}
                </section>
              )}
              {role === "student" && (
                <section className="panel list-panel">
                  <div className="split panel-title">
                    <h2>Bài tập sắp đến hạn</h2>
                    <Link to="/app/bai-tap" className="text-link">
                      Xem bài tập <ArrowRight size={15} />
                    </Link>
                  </div>
                  {result.upcoming.length ? (
                    result.upcoming.map((row) => (
                      <Link
                        key={row._id}
                        className="list-row"
                        to={"/app/bai-tap/" + row._id}
                      >
                        <span className="list-icon">
                          <CalendarClock size={18} />
                        </span>
                        <div className="list-text">
                          <strong>{row.title}</strong>
                          <small>{formatDate(row.dueDate)}</small>
                        </div>
                        <ArrowRight size={17} />
                      </Link>
                    ))
                  ) : (
                    <Empty title="Không có bài tập sắp đến hạn" />
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
export function Account() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.fullName);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const feedback = useFeedback();
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setUser(await call("PATCH", "/users/me", { fullName: name }));
      feedback.notify("Đã cập nhật tài khoản.");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle label="Hồ sơ cá nhân" title="Tài khoản" />
      <section className="panel narrow-panel">
        <div className="profile-chip account-profile">
          <Avatar name={user.fullName} />
          <div>
            <strong>{user.fullName}</strong>
            <small>{labels[user.role]}</small>
          </div>
        </div>
        <form className="editor-form" onSubmit={save}>
          <Field label="Họ và tên">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </Field>
          <Field label="Email">
            <input value={user.email} readOnly />
          </Field>
          {error && <Problem error={error} />}
          <button
            className="button primary"
            disabled={busy || name.trim() === user.fullName}
          >
            {busy ? "Đang lưu…" : "Lưu thông tin"}
          </button>
        </form>
      </section>
    </>
  );
}

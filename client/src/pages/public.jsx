import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FolderOpen,
  LibraryBig,
  LockKeyhole,
  Search,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { call, query, useData } from "../api.js";
import {
  Brand,
  CourseCard,
  DataState,
  Empty,
  Field,
  Loading,
  PageTitle,
  Pagination,
  Problem,
  Status,
  useFeedback,
} from "../ui.jsx";

function PublicFooter({ inside = false }) {
  const Tag = inside ? "div" : "footer";
  return (
    <Tag
      className={"public-footer" + (inside ? " catalog-footer" : "")}
      role={inside ? "contentinfo" : undefined}
    >
      <div className={inside ? "" : "public-wrap wrap"}>
        <Brand />
        <span>Hệ thống lớp học trực tuyến</span>
        <Link to="/gioi-thieu">Giới thiệu EduClass</Link>
      </div>
    </Tag>
  );
}
export function PublicLayout() {
  const { user } = useAuth();
  const home = useLocation().pathname === "/";
  return (
    <>
      <header className={"public-header nav" + (home ? " home-nav" : "")}>
        <div className="public-wrap wrap public-nav">
          <Brand />
          <nav aria-label="Điều hướng chính">
            <NavLink to="/khoa-hoc">Khóa học</NavLink>
            <NavLink to="/gioi-thieu">Giới thiệu</NavLink>
          </nav>
          <Link
            className="button secondary compact"
            to={user ? "/app" : "/dang-nhap"}
          >
            {user ? "Vào lớp học" : "Đăng nhập"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      {!home && <PublicFooter />}
    </>
  );
}
function Highlight() {
  const section = useRef(null);
  useEffect(() => {
    const element = section.current;
    let disposed = false;
    let mounted;
    const modulePath = new URL(
      "/assets/moments/moments.js",
      window.location.origin,
    ).href;
    import(/* @vite-ignore */ modulePath)
      .then(async (module) => {
        if (disposed) return;
        mounted = await module.mount(element);
        if (!element.isConnected) mounted?.destroy?.();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      mounted?.destroy?.();
    };
  }, []);
  return (
    <section
      ref={section}
      id="workflow"
      className="workflow"
      data-moment="word-highlight"
    >
      <div className="public-wrap wrap workflow-inner">
        <h2 className="mo-wh__text">
          Học liệu, bài tập và điểm số trong cùng một lớp.
        </h2>
        <div className="workflow-layout grid">
          <div className="workflow-steps">
            <div>
              <span className="workflow-icon">
                <BookOpen size={25} />
              </span>
              <h3>Học theo từng bài</h3>
              <p>Đọc nội dung, xem video và tải tài liệu từ giảng viên.</p>
            </div>
            <div>
              <span className="workflow-icon">
                <FolderOpen size={25} />
              </span>
              <h3>Nộp bài trực tuyến</h3>
              <p>Gửi bài bằng văn bản hoặc tệp.</p>
            </div>
            <div>
              <span className="workflow-icon">
                <ClipboardCheck size={25} />
              </span>
              <h3>Xem điểm và nhận xét</h3>
              <p>Theo dõi tiến độ và đọc phản hồi khi điểm được công bố.</p>
            </div>
          </div>
          <figure className="workflow-window">
            <img
              src="/product-workspace.png"
              width="1440"
              height="900"
              loading="lazy"
              alt="Bảng điều khiển EduClass hiển thị tiến độ học tập và bài tập sắp đến hạn"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
export function Home() {
  const latest = useData("/courses?limit=3");
  return (
    <>
      <section id="home" className="hero hero--split" data-enter>
        <div className="public-wrap wrap">
          <div className="hero-text split grid">
            <div className="hero-copy">
              <div className="live-label">
                <span /> Nền tảng học tập số
              </div>
              <h1>
                Lớp học
                <br />
                trực tuyến<span className="brand-dot">.</span>
              </h1>
              <p>
                Ghi danh, học theo lộ trình và nộp bài trên EduClass. Giảng viên
                quản lý học liệu và công bố điểm ngay trong lớp.
              </p>
              <div className="hero-actions">
                <Link className="button primary" to="/khoa-hoc">
                  Khám phá khóa học <ArrowRight size={18} />
                </Link>
                <a className="button secondary" href="#workflow">
                  Cách học <ArrowDown size={16} />
                </a>
              </div>
            </div>
            <div className="hero-visual" data-visual>
              <div className="hero-grid" aria-hidden="true" />
              <div className="app-frame">
                <div className="app-frame-head">
                  <span className="frame-icon">
                    <LibraryBig size={22} />
                  </span>
                  <div>
                    <strong>Danh mục EduClass</strong>
                    <small>Khóa học đang mở</small>
                  </div>
                  <span className="frame-dot" aria-hidden="true" />
                </div>
                <DataState state={latest}>
                  {({ items, total }) => (
                    <>
                      <div className="app-frame-list">
                        {items.length ? (
                          items.map((course) => (
                            <Link
                              key={course._id}
                              to={"/khoa-hoc/" + course._id}
                              className="frame-row"
                            >
                              <span className="frame-code">
                                <BookOpen size={19} />
                              </span>
                              <div>
                                <strong>{course.title}</strong>
                                <small>
                                  {course.courseCode} · {course.category}
                                </small>
                              </div>
                              <ChevronRight size={18} />
                            </Link>
                          ))
                        ) : (
                          <Empty title="Chưa có lớp mở ghi danh" />
                        )}
                      </div>
                      <Link className="frame-footer" to="/khoa-hoc">
                        <span>{total} khóa học đang mở</span>
                        <ArrowRight size={17} />
                      </Link>
                    </>
                  )}
                </DataState>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Highlight />
      <section id="catalog" className="home-catalog">
        <div className="public-wrap wrap">
          <div className="split section-title">
            <h2>Khóa học đang mở</h2>
            <Link className="button secondary" to="/khoa-hoc">
              Khám phá khóa học <ArrowRight size={17} />
            </Link>
          </div>
          <DataState state={latest}>
            {({ items }) => (
              <div className="course-grid grid">
                {items.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    to={"/khoa-hoc/" + course._id}
                  />
                ))}
              </div>
            )}
          </DataState>
          <PublicFooter inside />
        </div>
      </section>
    </>
  );
}
export function About() {
  return (
    <>
      <section className="public-wrap standalone">
        <PageTitle label="EduClass" title="Giới thiệu hệ thống">
          EduClass hỗ trợ lớp học trực tuyến trong môn Lập trình Web. Mỗi lớp có
          một nơi để đăng bài học, chia sẻ tài liệu, giao bài và xem kết quả.
        </PageTitle>
        <div className="role-grid">
          {[
            [
              "Sinh viên",
              "Ghi danh, đọc bài học, nộp bài và theo dõi kết quả.",
            ],
            [
              "Giảng viên",
              "Tổ chức nội dung, giao bài, theo dõi sinh viên và công bố điểm.",
            ],
            [
              "Quản trị viên",
              "Quản lý tài khoản và trạng thái khóa học trên toàn hệ thống.",
            ],
          ].map(([name, detail]) => (
            <article className="panel" key={name}>
              <h2>{name}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </div>
        <Link className="button primary mt-6" to="/khoa-hoc">
          Khám phá khóa học <ArrowRight size={18} />
        </Link>
      </section>
      <Highlight />
    </>
  );
}
export function Catalog({ inside = false }) {
  const [filters, setFilters] = useState({ search: "", page: 1, category: "" });
  const [input, setInput] = useState("");
  const courses = useData(query("/courses", filters));
  const categories = useData("/categories");
  return (
    <section className={inside ? "" : "public-wrap standalone"}>
      <PageTitle label="Danh mục EduClass" title="Khám phá khóa học">
        Tìm các lớp đang mở ghi danh và xem nội dung giới thiệu của từng khóa.
      </PageTitle>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((old) => ({ ...old, search: input.trim(), page: 1 }));
        }}
      >
        <Field label="Tên hoặc mã khóa học">
          <input
            placeholder="Ví dụ: MongoDB"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </Field>
        <Field label="Danh mục">
          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((old) => ({
                ...old,
                category: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">Tất cả danh mục</option>
            {categories.data?.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </Field>
        <button className="button primary">
          <Search size={17} /> Tìm khóa học
        </button>
      </form>
      <DataState state={courses}>
        {(data) => (
          <>
            {data.items.length ? (
              <>
                <p className="result-count">{data.total} khóa học</p>
                <div className="course-grid">
                  {data.items.map((course) => (
                    <CourseCard
                      key={course._id}
                      course={course}
                      to={"/khoa-hoc/" + course._id}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Empty title="Không tìm thấy khóa học" />
            )}
            <Pagination
              data={data}
              setPage={(page) => setFilters((old) => ({ ...old, page }))}
            />
          </>
        )}
      </DataState>
    </section>
  );
}
export function PublicCourse() {
  const { id } = useParams();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const data = useData("/courses/" + id, version + ":" + (user?._id || ""));
  const feedback = useFeedback();
  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      await call("POST", "/courses/" + id + "/enroll");
      setVersion((old) => old + 1);
      feedback.notify("Ghi danh thành công.");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="public-wrap standalone">
      <Link className="back-link" to="/khoa-hoc">
        ‹ Danh mục khóa học
      </Link>
      <DataState state={data}>
        {(course) => (
          <>
            <div className="public-course-hero">
              <div className="course-intro">
                <p className="eyebrow">
                  {course.category} · {course.courseCode}
                </p>
                <h1>{course.title}</h1>
                <p>{course.description}</p>
                <Status value={course.status} />
              </div>
              <div className="course-summary panel">
                <BookOpen size={28} />
                <h2>Thông tin lớp học</h2>
                <dl>
                  <div>
                    <dt>Giảng viên</dt>
                    <dd>{course.teacherId?.fullName}</dd>
                  </div>
                  <div>
                    <dt>Bài học</dt>
                    <dd>{course.lessonCount}</dd>
                  </div>
                </dl>
                {course.enrolled ||
                (user?.role === "teacher" &&
                  user._id === course.teacherId?._id) ? (
                  <Link className="button primary" to={"/app/khoa-hoc/" + id}>
                    Vào lớp học <ArrowRight size={16} />
                  </Link>
                ) : (
                  course.status === "open" &&
                  (!user ? (
                    <Link
                      className="button primary"
                      to="/dang-nhap"
                      state={{ next: "/khoa-hoc/" + id }}
                    >
                      Đăng nhập để ghi danh
                    </Link>
                  ) : (
                    user.role === "student" && (
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={enroll}
                      >
                        {busy ? "Đang ghi danh…" : "Ghi danh khóa học"}
                        <ArrowRight size={16} />
                      </button>
                    )
                  ))
                )}
                {error && <Problem error={error} />}
              </div>
            </div>
          </>
        )}
      </DataState>
    </section>
  );
}
export function AuthPage({ register = false }) {
  const { ready, user, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const next =
    typeof location.state?.next === "string" &&
    /^\/(app|khoa-hoc)(\/|$)/.test(location.state.next)
      ? location.state.next
      : "/app";
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(
        register ? "register" : "login",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      navigate(next, { replace: true });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;
  if (user)
    return (
      <section className="public-wrap standalone">
        <PageTitle title="Bạn đã đăng nhập">
          Phiên đăng nhập hiện tại có thể truy cập EduClass.
        </PageTitle>
        <Link className="button primary" to={next}>
          Vào lớp học
        </Link>
      </section>
    );
  return (
    <div className="public-wrap auth-layout">
      <div className="auth-art" data-enter>
        <div className="auth-orbit" aria-hidden="true" />
        <LockKeyhole size={32} aria-hidden="true" />
        <p className="eyebrow">EduClass</p>
        <h2>Không gian học tập của bạn.</h2>
        <p>
          Bài học, bài tập và phản hồi của giảng viên trong cùng một tài khoản.
        </p>
      </div>
      <section className="auth-form">
        <PageTitle
          label={register ? "Tài khoản sinh viên" : "Tài khoản EduClass"}
          title={register ? "Đăng ký" : "Đăng nhập"}
        >
          {register
            ? "Tạo tài khoản để ghi danh và bắt đầu học."
            : "Nhập thông tin tài khoản để vào lớp học."}
        </PageTitle>
        <form className="editor-form" onSubmit={submit}>
          {register && (
            <Field label="Họ và tên">
              <input
                name="fullName"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </Field>
          )}
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field
            label="Mật khẩu"
            help={register ? "Tối thiểu 8 ký tự." : undefined}
          >
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={register ? 8 : 1}
            />
          </Field>
          {register && (
            <Field label="Xác nhận mật khẩu">
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          )}
          {error && <Problem error={error} />}
          <button className="button primary" disabled={busy}>
            {busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link
            to={register ? "/dang-nhap" : "/dang-ky"}
            state={location.state}
          >
            {register ? "Đăng nhập" : "Đăng ký sinh viên"}
          </Link>
        </p>
      </section>
    </div>
  );
}
export function ErrorPage({ restricted = false }) {
  return (
    <section className="public-wrap standalone">
      <PageTitle
        label={restricted ? "Lỗi 403" : "Lỗi 404"}
        title={
          restricted ? "Bạn chưa có quyền truy cập" : "Không tìm thấy trang"
        }
      >
        Bạn có thể quay lại trang chủ để tiếp tục.
      </PageTitle>
      <Link className="button primary" to="/">
        Về trang chủ <ArrowRight size={17} />
      </Link>
    </section>
  );
}

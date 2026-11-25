import { Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth.jsx";
import {
  About,
  AuthPage,
  Catalog,
  ErrorPage,
  Home,
  PublicCourse,
  PublicLayout,
} from "./pages/public.jsx";
import { Account, Dashboard, Shell } from "./pages/workspace.jsx";
import { AdminCourses, AdminUsers } from "./pages/admin.jsx";
import { CourseDirectory, CourseWorkspace } from "./pages/course.jsx";
import {
  AssignmentDetail,
  StudentAssignmentList,
} from "./pages/assignments.jsx";

export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="gioi-thieu" element={<About />} />
          <Route path="khoa-hoc" element={<Catalog />} />
          <Route path="khoa-hoc/:id" element={<PublicCourse />} />
          <Route path="dang-nhap" element={<AuthPage key="login" />} />
          <Route
            path="dang-ky"
            element={<AuthPage key="register" register />}
          />
          <Route path="403" element={<ErrorPage restricted />} />
          <Route path="*" element={<ErrorPage />} />
        </Route>
        <Route element={<RequireRole />}>
          <Route path="app" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="tai-khoan" element={<Account />} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="nguoi-dung" element={<AdminUsers />} />
              <Route path="danh-muc" element={<AdminCourses />} />
            </Route>
            <Route element={<RequireRole roles={["teacher"]} />}>
              <Route
                path="giang-vien/hoc-lieu"
                element={
                  <CourseDirectory key="materials" section="materials" />
                }
              />
              <Route
                path="giang-vien/bai-tap"
                element={
                  <CourseDirectory key="assignments" section="assignments" />
                }
              />
              <Route
                path="giang-vien/sinh-vien"
                element={<CourseDirectory key="students" section="students" />}
              />
              <Route
                path="giang-vien/cham-diem"
                element={<CourseDirectory key="grading" section="grading" />}
              />
            </Route>
            <Route element={<RequireRole roles={["teacher", "student"]} />}>
              <Route path="khoa-hoc" element={<CourseDirectory />} />
              <Route path="khoa-hoc/:id" element={<CourseWorkspace />} />
              <Route path="bai-tap/:id" element={<AssignmentDetail />} />
            </Route>
            <Route element={<RequireRole roles={["student"]} />}>
              <Route path="kham-pha" element={<Catalog inside />} />
              <Route path="bai-tap" element={<StudentAssignmentList />} />
              <Route
                path="ket-qua"
                element={<StudentAssignmentList results />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

import { useState } from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { call, query, useData } from "../api.js";
import {
  Avatar,
  DataState,
  Dialog,
  Editor,
  Empty,
  Field,
  PageTitle,
  Pagination,
  Status,
  formatDate,
  labels,
  useFeedback,
} from "../ui.jsx";

const roles = ["admin", "teacher", "student"];
export const courseStatuses = ["draft", "open", "closed", "archived"];
const teacherFields = [
  {
    name: "fullName",
    label: "Họ và tên",
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "password",
    label: "Mật khẩu ban đầu",
    type: "password",
    required: true,
    minLength: 8,
    help: "Tối thiểu 8 ký tự.",
  },
];
function SearchForm({ children, label, value, setValue, search }) {
  return (
    <form
      className="filters"
      onSubmit={(event) => {
        event.preventDefault();
        search(value.trim());
      }}
    >
      <Field label={label}>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      {children}
      <button className="button primary">
        <Search size={17} /> Tìm kiếm
      </button>
    </form>
  );
}
export function AdminUsers() {
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    isActive: "",
    page: 1,
  });
  const [input, setInput] = useState("");
  const [version, setVersion] = useState(0);
  const [action, setAction] = useState(null);
  const users = useData(query("/admin/users", filters), version);
  const selected = useData(
    action && action !== "new" ? "/admin/users/" + action : null,
  );
  const { confirm, notify } = useFeedback();
  const refresh = () => setVersion((value) => value + 1);
  const change = (name, value) =>
    setFilters((old) => ({ ...old, [name]: value, page: 1 }));
  function toggle(row) {
    const label = row.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản";
    confirm({
      title: label,
      message: "Xác nhận thay đổi quyền truy cập của " + row.fullName + "?",
      label,
      danger: row.isActive,
      run: async () => {
        await call("PATCH", "/admin/users/" + row._id + "/status", {
          isActive: !row.isActive,
        });
        refresh();
        notify("Đã cập nhật trạng thái tài khoản.");
      },
    });
  }
  return (
    <>
      <PageTitle
        label="Quản trị hệ thống"
        title="Quản lý người dùng"
        action={
          <button className="button primary" onClick={() => setAction("new")}>
            <Plus size={17} /> Tạo tài khoản giảng viên
          </button>
        }
      >
        Tìm hồ sơ và kiểm soát quyền truy cập hệ thống.
      </PageTitle>
      <SearchForm
        label="Họ tên hoặc email"
        value={input}
        setValue={setInput}
        search={(value) => change("search", value)}
      >
        <Field label="Vai trò">
          <select
            value={filters.role}
            onChange={(event) => change("role", event.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {labels[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select
            value={filters.isActive}
            onChange={(event) => change("isActive", event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </Field>
      </SearchForm>
      <DataState state={users}>
        {(data) => (
          <>
            {!data.items.length ? (
              <Empty title="Không tìm thấy người dùng" />
            ) : (
              <div className="table-card">
                <table>
                  <caption>{data.total} người dùng</caption>
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row._id}>
                        <td>
                          <button
                            className="profile-chip text-button"
                            onClick={() => setAction(row._id)}
                          >
                            <Avatar name={row.fullName} />
                            <span>
                              <strong>{row.fullName}</strong>
                              <small>{row.email}</small>
                            </span>
                          </button>
                        </td>
                        <td>{labels[row.role]}</td>
                        <td>
                          <Status value={row.isActive ? "open" : "late"}>
                            {row.isActive ? "Đang hoạt động" : "Đã khóa"}
                          </Status>
                        </td>
                        <td>
                          {row.role === "admin" ? (
                            <span className="inline-icon">
                              <ShieldCheck size={16} /> Được bảo vệ
                            </span>
                          ) : (
                            <button
                              className="button secondary compact"
                              onClick={() => toggle(row)}
                            >
                              {row.isActive ? "Khóa tài khoản" : "Mở khóa"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              data={data}
              setPage={(page) => setFilters((old) => ({ ...old, page }))}
            />
          </>
        )}
      </DataState>
      {action === "new" && (
        <Editor
          title="Tạo tài khoản giảng viên"
          close={() => setAction(null)}
          fields={teacherFields}
          submitLabel="Tạo tài khoản"
          save={async (value) => {
            await call("POST", "/admin/teachers", value);
            refresh();
            notify("Đã tạo tài khoản giảng viên.");
          }}
        />
      )}
      {action && action !== "new" && (
        <Dialog title="Thông tin người dùng" close={() => setAction(null)}>
          <DataState state={selected}>
            {(row) => (
              <dl className="details">
                <div>
                  <dt>Họ và tên</dt>
                  <dd>{row.fullName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{row.email}</dd>
                </div>
                <div>
                  <dt>Vai trò</dt>
                  <dd>{labels[row.role]}</dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd>{row.isActive ? "Đang hoạt động" : "Đã khóa"}</dd>
                </div>
                <div>
                  <dt>Ngày tạo</dt>
                  <dd>{formatDate(row.createdAt)}</dd>
                </div>
              </dl>
            )}
          </DataState>
        </Dialog>
      )}
    </>
  );
}
export function AdminCourses() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    teacherId: "",
    page: 1,
  });
  const [input, setInput] = useState("");
  const [version, setVersion] = useState(0);
  const [params, setParams] = useSearchParams();
  const courseId = params.get("course");
  const courses = useData(query("/admin/courses", filters), version);
  const teachers = useData("/admin/teachers");
  const selected = useData(courseId ? "/courses/" + courseId : null, version);
  const { confirm, notify } = useFeedback();
  const change = (name, value) =>
    setFilters((old) => ({ ...old, [name]: value, page: 1 }));
  function moderate(row, status) {
    if (status === row.status) return;
    confirm({
      title: "Đổi trạng thái khóa học",
      message:
        "Chuyển “" +
        row.title +
        "” sang trạng thái " +
        labels[status].toLowerCase() +
        "?",
      label: "Cập nhật trạng thái",
      danger: status === "archived",
      run: async () => {
        await call("PATCH", "/admin/courses/" + row._id + "/status", {
          status,
        });
        setVersion((value) => value + 1);
        notify("Đã cập nhật trạng thái khóa học.");
      },
    });
  }
  return (
    <>
      <PageTitle label="Quản trị hệ thống" title="Quản lý khóa học">
        Xem danh mục toàn hệ thống và điều chỉnh trạng thái hiển thị của các
        lớp.
      </PageTitle>
      <SearchForm
        label="Tên hoặc mã khóa học"
        value={input}
        setValue={setInput}
        search={(value) => change("search", value)}
      >
        <Field label="Giảng viên">
          <select
            value={filters.teacherId}
            onChange={(event) => change("teacherId", event.target.value)}
          >
            <option value="">Tất cả giảng viên</option>
            {teachers.data?.map((row) => (
              <option key={row._id} value={row._id}>
                {row.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select
            value={filters.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {courseStatuses.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </Field>
      </SearchForm>
      <DataState state={courses}>
        {(data) => (
          <>
            {!data.items.length ? (
              <Empty title="Không tìm thấy khóa học" />
            ) : (
              <div className="table-card">
                <table>
                  <caption>{data.total} khóa học</caption>
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Giảng viên</th>
                      <th>Danh mục</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row._id}>
                        <td>
                          <button
                            className="text-button table-course"
                            onClick={() => setParams({ course: row._id })}
                          >
                            <strong>{row.title}</strong>
                            <small>{row.courseCode}</small>
                          </button>
                        </td>
                        <td>{row.teacherId?.fullName}</td>
                        <td>{row.category}</td>
                        <td>
                          <select
                            aria-label={"Trạng thái " + row.title}
                            value={row.status}
                            onChange={(event) =>
                              moderate(row, event.target.value)
                            }
                          >
                            {courseStatuses.map((value) => (
                              <option key={value} value={value}>
                                {labels[value]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              data={data}
              setPage={(page) => setFilters((old) => ({ ...old, page }))}
            />
          </>
        )}
      </DataState>
      {courseId && (
        <Dialog title="Thông tin khóa học" close={() => setParams({})}>
          <DataState state={selected}>
            {(row) => (
              <>
                <h3>{row.title}</h3>
                <p className="preserve">{row.description}</p>
                <dl className="details">
                  <div>
                    <dt>Mã khóa học</dt>
                    <dd>{row.courseCode}</dd>
                  </div>
                  <div>
                    <dt>Danh mục</dt>
                    <dd>{row.category}</dd>
                  </div>
                  <div>
                    <dt>Giảng viên</dt>
                    <dd>{row.teacherId?.fullName}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>{labels[row.status]}</dd>
                  </div>
                </dl>
              </>
            )}
          </DataState>
        </Dialog>
      )}
    </>
  );
}

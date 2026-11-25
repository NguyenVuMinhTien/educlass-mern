import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const baseURL = process.env.EDUCLASS_URL || 'http://localhost:5173';
const output = 'docs/screenshots';
const courseName = 'Lập trình Web MERN Stack';
const assignmentName = 'Thiết kế REST API cho thư viện';
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }),
  headless: true,
});
const errors = [];
const unexpectedResponses = [];
await mkdir(output, { recursive: true });
async function pageAt(width = 1440, height = 900) {
  const page = await browser.newPage({ baseURL, viewport: { width, height }, locale: 'vi-VN', reducedMotion: 'reduce' });
  page.setDefaultTimeout(10_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (event) => {
    if (event.type() === 'error' && !event.text().startsWith('Failed to load resource')) errors.push(event.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 500) unexpectedResponses.push(response.url() + ' ' + response.status());
  });
  return page;
}
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
async function save(page, name, fullPage = false) {
  await page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu' }).waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const toast = page.locator('.toast');
  if (await toast.count()) await toast.waitFor({ state: 'hidden', timeout: 6000 });
  await page.screenshot({ path: output + '/' + name + '.png', fullPage, animations: 'disabled' });
}
async function login(page, role) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email', { exact: true }).fill(role + '@educlass.example');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('EduClass!2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/app');
  await page.getByRole('heading', { name: /^Xin chào,/ }).waitFor();
  await page.locator('.stat').first().waitFor();
}
const nav = (page) => page.getByRole('navigation', { name: 'Điều hướng lớp học' });
const coursesTab = (page) => page.getByRole('navigation', { name: 'Nội dung khóa học' });
const openTab = (page, name) => coursesTab(page).getByRole('link', { name, exact: true }).click();
async function noOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Trang tràn ngang ở ' + (await page.viewportSize()).width + ' px: ' + page.url());
}
try {
  const guest = await pageAt();
  await guest.goto('/');
  await guest.getByText('5 khóa học đang mở', { exact: true }).waitFor();
  await guest.locator('#workflow[data-moment-mounted]').waitFor();
  await guest.keyboard.press('Tab');
  assert.equal(await guest.locator(':focus').textContent(), 'Đến nội dung chính');
  await guest.locator('.app-frame a').first().focus();
  await guest.locator('.app-frame a').first().blur();
  await save(guest, '01-trang-chu');
  await guest.goto('/dang-nhap'); await heading(guest, 'Đăng nhập'); await save(guest, '02-dang-nhap');
  await guest.getByRole('link', { name: 'Đăng ký sinh viên' }).click(); await heading(guest, 'Đăng ký'); await save(guest, '03-dang-ky');
  await guest.goto('/app'); await guest.waitForURL('**/dang-nhap'); await guest.close();
  console.log('UI01 PASS · Trang công khai, form xác thực và điều hướng yêu cầu đăng nhập.');

  const admin = await pageAt();
  await login(admin, 'admin'); await save(admin, '04-dashboard-admin');
  await nav(admin).getByRole('link', { name: 'Quản lý người dùng' }).click();
  await admin.getByRole('table').waitFor(); await save(admin, '05-quan-ly-nguoi-dung');
  await admin.getByLabel('Vai trò', { exact: true }).selectOption('teacher');
  await admin.getByRole('button', { name: /Nguyễn Minh Anh/ }).click();
  await admin.getByRole('dialog', { name: 'Thông tin người dùng' }).getByText('teacher1@educlass.example').waitFor();
  await admin.keyboard.press('Escape');
  await nav(admin).getByRole('link', { name: 'Quản lý khóa học' }).click();
  await admin.getByRole('table').waitFor(); await save(admin, '06-quan-ly-khoa-hoc-toan-he-thong');
  await admin.getByLabel('Trạng thái Lập trình Web MERN Stack', { exact: true }).selectOption('closed');
  await admin.getByRole('dialog', { name: 'Đổi trạng thái khóa học' }).waitFor();
  await admin.getByRole('button', { name: 'Hủy', exact: true }).click();
  assert.equal(await admin.getByLabel('Trạng thái Lập trình Web MERN Stack', { exact: true }).inputValue(), 'open');
  await admin.close();
  console.log('UI02 PASS · Dashboards và bảng Admin, bộ lọc, chi tiết, xác nhận đổi trạng thái.');

  const teacher = await pageAt();
  await login(teacher, 'teacher1'); await save(teacher, '07-dashboard-teacher');
  await teacher.getByRole('link', { name: 'Tạo khóa học', exact: true }).click();
  await teacher.getByRole('dialog', { name: 'Tạo khóa học' }).waitFor(); await save(teacher, '08-tao-khoa-hoc');
  const previewId = 'UI' + randomUUID().slice(0, 7).toUpperCase();
  await teacher.getByLabel('Tên khóa học').fill('Bản nháp kiểm tra giao diện');
  await teacher.getByLabel('Mã khóa học').fill(previewId);
  await teacher.getByLabel('Mô tả khóa học').fill('Khóa thử thao tác tạo và xóa qua ứng dụng.');
  await teacher.getByLabel('Danh mục', { exact: true }).fill('Kiểm thử');
  await teacher.getByRole('dialog').getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await heading(teacher, 'Bản nháp kiểm tra giao diện');
  await teacher.getByRole('button', { name: 'Xóa bản nháp', exact: true }).click();
  await teacher.getByRole('dialog').getByRole('button', { name: 'Xóa bản nháp', exact: true }).click();
  await heading(teacher, 'Khóa học của tôi');
  await teacher.getByRole('link', { name: new RegExp(courseName) }).click();
  await heading(teacher, courseName); await save(teacher, '09-chi-tiet-khoa-hoc-giang-vien');
  await openTab(teacher, 'Tài liệu'); await teacher.getByText('Tài liệu hướng dẫn dự án', { exact: true }).waitFor(); await save(teacher, '10-quan-ly-hoc-lieu');
  await teacher.getByRole('button', { name: 'Xem trước' }).click(); await teacher.locator('iframe.pdf-preview').waitFor();
  const downloadEvent = teacher.waitForEvent('download');
  await teacher.getByRole('dialog').getByRole('button', { name: 'Tải tệp' }).click();
  assert.equal((await downloadEvent).suggestedFilename(), 'huong-dan-mern.pdf');
  await teacher.keyboard.press('Escape');
  await openTab(teacher, 'Bài tập'); await teacher.getByRole('link', { name: assignmentName }).waitFor();
  await teacher.getByRole('button', { name: 'Tạo bài tập', exact: true }).click();
  await teacher.getByRole('dialog', { name: 'Tạo bài tập' }).waitFor(); await save(teacher, '11-tao-bai-tap'); await teacher.keyboard.press('Escape');
  await openTab(teacher, 'Sinh viên'); await teacher.getByRole('table').waitFor(); await save(teacher, '12-danh-sach-sinh-vien');
  await openTab(teacher, 'Bài tập'); await teacher.getByRole('link', { name: assignmentName }).click();
  await teacher.getByRole('button', { name: 'Chấm điểm', exact: true }).first().click();
  await teacher.getByRole('dialog').getByLabel('Điểm / 10').waitFor(); await save(teacher, '13-cham-diem');
  await teacher.keyboard.press('Escape'); await teacher.close();
  console.log('UI03 PASS · Tạo/xóa bản nháp, xem và tải PDF, danh sách lớp và biểu mẫu chấm điểm.');

  const student = await pageAt();
  await login(student, 'student1'); await save(student, '14-dashboard-student');
  await nav(student).getByRole('link', { name: 'Khám phá khóa học' }).click();
  await student.getByRole('link', { name: new RegExp(courseName) }).waitFor();
  await save(student, '15-kham-pha-khoa-hoc');
  await student.getByLabel('Tên hoặc mã khóa học').fill('MERN');
  await student.getByRole('button', { name: 'Tìm khóa học' }).click();
  await student.getByText('1 khóa học', { exact: true }).waitFor();
  await student.getByRole('link', { name: new RegExp(courseName) }).click();
  await heading(student, courseName); await save(student, '16-gioi-thieu-khoa-hoc');
  await student.getByRole('main').getByRole('link', { name: 'Vào lớp học', exact: true }).click();
  await openTab(student, 'Nội dung học tập'); await heading(student, 'Kiến trúc ứng dụng MERN'); await save(student, '17-trang-hoc-tap');
  await student.getByRole('button', { name: /Thiết kế REST API/ }).click(); await heading(student, 'Thiết kế REST API');
  await nav(student).getByRole('link', { name: 'Bài tập', exact: true }).click();
  await student.getByRole('link', { name: /Xử lý danh sách sinh viên/ }).click();
  await student.getByRole('button', { name: 'Nộp bài tập', exact: true }).click();
  await student.getByRole('dialog', { name: 'Nộp bài tập', exact: true }).waitFor(); await save(student, '18-nop-bai');
  await student.keyboard.press('Escape');
  await nav(student).getByRole('link', { name: 'Kết quả học tập', exact: true }).click();
  await student.getByRole('link', { name: new RegExp(assignmentName) }).click();
  await student.getByText('8.5 / 10', { exact: true }).waitFor(); await save(student, '19-diem-va-nhan-xet');
  await student.goto('/app/nguoi-dung'); await heading(student, 'Bạn chưa có quyền truy cập');
  await student.close();
  console.log('UI04 PASS · Tìm khóa học, mở bài học, form nộp bài, điểm 8.5 và route 403.');

  for (const width of [375, 390, 768, 1024, 1440]) {
    const page = await pageAt(width, width < 500 ? 844 : 900);
    await page.goto('/'); await page.locator('.frame-row').first().waitFor(); await noOverflow(page);
    if (width === 375) await save(page, '20-trang-chu-tren-dien-thoai');
    await login(page, 'student1'); await noOverflow(page);
    if (width === 375) {
      await page.getByRole('button', { name: 'Mở menu' }).click();
      await nav(page).getByRole('link', { name: 'Khóa học của tôi' }).click();
      await heading(page, 'Khóa học của tôi'); await page.locator('.course-card').first().waitFor();
      await noOverflow(page); await save(page, '21-lop-hoc-tren-dien-thoai');
    }
    await page.close();
  }
  if (process.argv.includes('--acceptance')) await runAcceptance();
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedResponses, []);
  console.log('UI05 PASS · 375, 390, 768, 1024, 1440 px, drawer mobile, không tràn ngang, không lỗi JavaScript/API 5xx.');
} finally {
  await browser.close();
}


async function runAcceptance() {
  const suffix = randomUUID().slice(0, 7).toUpperCase();
  const code = 'QA' + suffix;
  const studentName = 'Sinh viên nghiệm thu ' + suffix;
  const title = 'Khóa kiểm tra ghi danh ' + suffix;
  const email = 'qa-' + suffix.toLowerCase() + '@educlass.example';
  const assignmentTitle = 'Bài làm nghiệm thu';
  const handout = 'server/assets/huong-dan-mern.pdf';
  const admin = await pageAt();
  const teacher = await pageAt();
  const student = await pageAt();
  const dialog = (page) => page.getByRole('dialog');
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const field = (page, name) => page.getByLabel(name, { exact: true });
  const saveEditor = async (page, label = 'Lưu thay đổi') => {
    await button(dialog(page), label).click();
    await dialog(page).waitFor({ state: 'hidden' });
  };
  try {
    await login(admin, 'admin');
    await login(teacher, 'teacher1');
    await teacher.getByRole('link', { name: 'Tạo khóa học', exact: true }).click();
    await field(teacher, 'Tên khóa học').fill(title);
    await field(teacher, 'Mã khóa học').fill(code);
    await field(teacher, 'Mô tả khóa học').fill('Khóa học tạo để nghiệm thu toàn bộ luồng trình duyệt.');
    await field(teacher, 'Danh mục').fill('Kiểm thử');
    await saveEditor(teacher, 'Tạo khóa học');
    await heading(teacher, title);
    const workUrl = new URL(teacher.url()).pathname;

    await openTab(teacher, 'Nội dung học tập');
    await button(teacher, 'Thêm bài học').click();
    await field(teacher, 'Tên bài học').fill('Bài học kiểm tra');
    await field(teacher, 'Nội dung bài học').fill('Tóm tắt quan hệ giữa Course và Enrollment.');
    await saveEditor(teacher);
    await heading(teacher, 'Bài học kiểm tra');

    await openTab(teacher, 'Tài liệu');
    await button(teacher, 'Thêm tài liệu').click();
    await field(teacher, 'Tên tài liệu').fill('Tài liệu nghiệm thu');
    await field(teacher, 'Tệp PDF').setInputFiles(handout);
    await saveEditor(teacher);
    await teacher.getByText('Tài liệu nghiệm thu', { exact: true }).waitFor();
    await button(teacher, 'Thêm tài liệu').click();
    await field(teacher, 'Tên tài liệu').fill('Bài đọc nghiệm thu');
    await field(teacher, 'Loại tài liệu').selectOption('text');
    await field(teacher, 'Nội dung bài đọc').fill('Ghi danh chỉ thực hiện được khi lớp đang mở.');
    await saveEditor(teacher);
    await teacher.getByText('Bài đọc nghiệm thu', { exact: true }).waitFor();

    await openTab(teacher, 'Bài tập');
    await button(teacher, 'Tạo bài tập').click();
    await field(teacher, 'Tiêu đề bài tập').fill(assignmentTitle);
    await field(teacher, 'Yêu cầu bài làm').fill('Nêu ví dụ về API REST cùng kết quả mong đợi.');
    await saveEditor(teacher);
    await teacher.getByRole('link', { name: assignmentTitle, exact: true }).waitFor();
    await button(teacher, 'Sửa khóa học').click();
    await field(teacher, 'Trạng thái').selectOption('open');
    await saveEditor(teacher);

    await student.goto('/dang-ky');
    await field(student, 'Họ và tên').fill(studentName);
    await field(student, 'Email').fill(email);
    await field(student, 'Mật khẩu').fill('Classroom!QA2026');
    await field(student, 'Xác nhận mật khẩu').fill('Classroom!QA2026');
    await button(student, 'Tạo tài khoản').click();
    await student.waitForURL('**/app');
    await nav(student).getByRole('link', { name: 'Khám phá khóa học' }).click();
    await field(student, 'Tên hoặc mã khóa học').fill(code);
    await button(student, 'Tìm khóa học').click();
    await student.getByRole('link', { name: new RegExp(title) }).click();
    await button(student, 'Ghi danh khóa học').click();
    await student.getByRole('main').getByRole('link', { name: 'Vào lớp học', exact: true }).click();

    await openTab(student, 'Nội dung học tập');
    await button(student, 'Đánh dấu hoàn thành').click();
    await button(student, 'Đã hoàn thành').waitFor();
    await openTab(student, 'Tài liệu');
    await student.getByText('Tài liệu nghiệm thu', { exact: true }).waitFor();
    const downloaded = student.waitForEvent('download');
    await button(student, 'Tải tệp').click();
    assert.equal((await downloaded).suggestedFilename(), 'huong-dan-mern.pdf');
    await openTab(student, 'Bài tập');
    await student.getByRole('link', { name: assignmentTitle, exact: true }).click();
    const assignmentUrl = new URL(student.url()).pathname;
    await button(student, 'Nộp bài tập').click();
    await field(student, 'Nội dung bài làm').fill('Bài làm nghiệm thu có nội dung và PDF đính kèm.');
    await field(student, 'Tệp bài làm').setInputFiles(handout);
    await saveEditor(student, 'Gửi bài nộp');
    await student.getByText('Đã nộp', { exact: true }).waitFor();

    await teacher.goto(workUrl + '?tab=students');
    await teacher.getByRole('cell', { name: new RegExp(studentName) }).waitFor();
    await teacher.goto(assignmentUrl);
    await button(teacher, 'Chấm điểm').click();
    await field(teacher, 'Điểm / 10').fill('9.25');
    await field(teacher, 'Nhận xét').fill('Giải thích quyền ghi danh rõ ràng.');
    await field(teacher, 'Công bố điểm cho sinh viên').check();
    await saveEditor(teacher, 'Lưu điểm');
    await student.reload();
    await student.getByText('9.25 / 10', { exact: true }).waitFor();
    await student.getByText('Giải thích quyền ghi danh rõ ràng.', { exact: true }).waitFor();

    await nav(admin).getByRole('link', { name: 'Quản lý người dùng' }).click();
    await field(admin, 'Họ tên hoặc email').fill(email);
    await button(admin, 'Tìm kiếm').click();
    const entry = admin.getByRole('row').filter({ hasText: studentName });
    await button(entry, 'Khóa tài khoản').click();
    await saveEditor(admin, 'Khóa tài khoản');
    await entry.getByText('Đã khóa', { exact: true }).waitFor();
    const denial = await student.request.get('/api/v1/auth/me');
    assert.equal(denial.status(), 403);
    await button(entry, 'Mở khóa').click();
    await saveEditor(admin, 'Mở khóa tài khoản');
    await entry.getByText('Đang hoạt động', { exact: true }).waitFor();
    const restored = await student.request.get('/api/v1/auth/me');
    assert.equal(restored.status(), 200);
    console.log('UI06 PASS · Đăng ký, tạo lớp và học liệu, ghi danh, tải PDF, nộp bài, chấm và công bố, khóa/mở tài khoản.');
  } finally {
    await Promise.all([admin.close(), teacher.close(), student.close()]);
  }
}

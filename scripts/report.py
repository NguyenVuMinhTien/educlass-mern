"""Render the A4 report from a local cover file and the Chrome evidence."""

import argparse
import json
import os
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PillowImage
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[1]
WIDTH = A4[0] - 118
INK = colors.HexColor("#202825")
ACCENT = colors.HexColor("#174D4B")
MUTED = colors.HexColor("#4A5B55")
LINE = colors.HexColor("#CAD8D0")
FILL = colors.HexColor("#EAF2ED")
STYLES = {}


def setup_fonts(path):
    for name, file in [("TimesVN", "times.ttf"), ("TimesVN-Bold", "timesbd.ttf"), ("TimesVN-Italic", "timesi.ttf")]:
        pdfmetrics.registerFont(TTFont(name, str(path / file)))
    pdfmetrics.registerFontFamily("TimesVN", normal="TimesVN", bold="TimesVN-Bold", italic="TimesVN-Italic")
    STYLES.update({
        "body": ParagraphStyle("body", fontName="TimesVN", fontSize=13, leading=17, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=10),
        "chapter": ParagraphStyle("chapter", fontName="TimesVN-Bold", fontSize=22, leading=25, textColor=ACCENT, spaceAfter=15, keepWithNext=True),
        "section": ParagraphStyle("section", fontName="TimesVN-Bold", fontSize=15, leading=19, textColor=INK, spaceBefore=5, spaceAfter=7, keepWithNext=True),
        "cell": ParagraphStyle("cell", fontName="TimesVN", fontSize=11.5, leading=14, textColor=INK),
        "cell_head": ParagraphStyle("cell_head", fontName="TimesVN-Bold", fontSize=11.5, leading=14, textColor=ACCENT),
        "caption": ParagraphStyle("caption", fontName="TimesVN-Italic", fontSize=11.5, leading=15, textColor=MUTED, spaceBefore=6, spaceAfter=12),
        "toc": ParagraphStyle("toc", fontName="TimesVN", fontSize=13, leading=23, textColor=INK),
        "cover_large": ParagraphStyle("cover_large", fontName="TimesVN-Bold", fontSize=27, leading=32, textColor=ACCENT, alignment=TA_CENTER),
        "cover_title": ParagraphStyle("cover_title", fontName="TimesVN-Bold", fontSize=16, leading=21, textColor=INK, alignment=TA_CENTER),
        "cover_small": ParagraphStyle("cover_small", fontName="TimesVN", fontSize=13, leading=19, textColor=INK, alignment=TA_CENTER),
    })


class Report(SimpleDocTemplate):
    def afterFlowable(self, block):
        if isinstance(block, Paragraph) and hasattr(block, "chapter_key"):
            key = block.chapter_key
            title = block.getPlainText()
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, 0)
            self.notify("TOCEntry", (0, title, self.page, key))


def para(text, style="body"):
    return Paragraph(text, STYLES[style])


def heading(text):
    return para(text, "section")


def chapter(title, key):
    result = para(title, "chapter")
    result.chapter_key = key
    return result


def table(rows, fractions):
    cells = [[para(escape(str(text)), "cell_head" if i == 0 else "cell") for text in row] for i, row in enumerate(rows)]
    result = Table(cells, colWidths=[WIDTH * share for share in fractions], repeatRows=1, hAlign="CENTER")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FILL),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F6F9F7")]),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, LINE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return result


def caption(text):
    return para(text, "caption")


def graphic(height, nodes, edges):
    drawing = Drawing(WIDTH, height)
    for x1, y1, x2, y2 in edges:
        drawing.add(Line(x1, y1, x2, y2, strokeColor=colors.HexColor("#62918A"), strokeWidth=1.2))
    for label, x, y, w, h in nodes:
        drawing.add(Rect(x, y, w, h, rx=5, ry=5, fillColor=FILL, strokeColor=LINE))
        drawing.add(String(x + w / 2, y + (h - 11) / 2 + 2, label, fontName="TimesVN-Bold",
                           fontSize=11, fillColor=ACCENT, textAnchor="middle"))
    return drawing


SCREEN_TITLES = [
    "Trang chủ và danh mục lớp đang mở", "Đăng nhập", "Đăng ký sinh viên", "Dashboard quản trị",
    "Quản lý người dùng", "Danh mục và trạng thái các lớp", "Dashboard giảng viên", "Biểu mẫu tạo khóa học",
    "Chi tiết khóa học giảng viên", "Quản lý học liệu", "Biểu mẫu tạo bài tập", "Danh sách sinh viên ghi danh",
    "Biểu mẫu chấm điểm", "Dashboard sinh viên", "Khám phá và lọc khóa học", "Giới thiệu khóa học",
    "Trang học tập", "Biểu mẫu nộp bài", "Điểm và nhận xét đã công bố", "Trang chủ ở 375 px", "Khóa học của tôi ở 375 px",
]


def shot(n, max_height=260, max_width=None, label=None):
    path, = (ROOT / "docs" / "screenshots").glob(f"{n:02d}-*.png")
    with PillowImage.open(path) as source:
        w, h = source.size
    scale = min((max_width or WIDTH) / w, max_height / h)
    return [Image(str(path), width=w * scale, height=h * scale, hAlign="CENTER"),
            caption(f"Hình {label or n}. {SCREEN_TITLES[n - 1]}.")]


def footer(canvas, doc):
    canvas.setTitle("Xây dựng Hệ thống Lớp học Trực tuyến | EduClass")
    canvas.setAuthor("Nhóm thực hiện EduClass")
    if doc.page == 1:
        return
    canvas.setStrokeColor(LINE)
    canvas.line(53, 45, A4[0] - 53, 45)
    canvas.setFont("TimesVN", 10)
    canvas.setFillColor(MUTED)
    canvas.drawString(53, 31, "EDUCLASS  /  TIỂU LUẬN LẬP TRÌNH WEB")
    canvas.drawRightString(A4[0] - 53, 31, str(doc.page))


def cover_page(data):
    identity = [("Giảng viên hướng dẫn", data["instructor"]), ("Năm học", data["year"])]
    if data.get("className"):
        identity.insert(1, ("Lớp", data["className"]))
    return [
        Spacer(1, 20),
        para(escape(data["university"].upper()), "cover_title"),
        para(escape(data["faculty"].upper()), "cover_small"),
        Spacer(1, 65),
        para("TIỂU LUẬN CUỐI KỲ", "cover_title"),
        para("Lập trình Web (MERN Stack)", "cover_small"),
        Spacer(1, 26),
        para("Xây dựng Hệ thống<br/>Lớp học Trực tuyến", "cover_large"),
        Spacer(1, 12),
        para("EduClass", "cover_title"),
        Spacer(1, 27),
        *[para(f"{escape(label)} &nbsp; <b>{escape(value)}</b>", "cover_small") for label, value in identity],
        Spacer(1, 25),
        para("Danh sách sinh viên thực hiện", "cover_title"),
        Spacer(1, 10),
        table([("Mã số sinh viên", "Họ và tên"), *data["members"]], [0.37, 0.63]),
        Spacer(1, 20),
        para("Đồng Nai", "cover_small"),
        PageBreak(),
    ]


def markdown_table(relative, header_starts):
    lines = (ROOT / "docs" / relative).read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith(header_starts))
    result = []
    for i, line in enumerate(lines[start:]):
        if not line.startswith("|"):
            break
        if i == 1:
            continue
        result.append([part.strip().replace("`", "") for part in line.strip("|").split("|")])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cover", type=Path, default=ROOT / ".local" / "report-cover.json")
    parser.add_argument("--out", type=Path, default=ROOT / "output" / "pdf" / "Bao-cao-tieu-luan-EduClass.pdf")
    parser.add_argument("--font-dir", type=Path, default=Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts")
    args = parser.parse_args()
    setup_fonts(args.font_dir)
    story = cover_page(json.loads(args.cover.read_text(encoding="utf-8")))
    toc = TableOfContents()
    toc.levelStyles = [STYLES["toc"]]
    toc.dotsMinLevel = 0
    story += [para("Mục lục", "chapter"), toc, Spacer(1, 13),
              para("Danh mục hình gồm hai sơ đồ ở Chương 3–4 và 21 ảnh minh chứng ở Chương 5 và phụ lục."),
              para("Bảng 1 mô tả phân quyền. Bảng 2 trình bày các collection. Bảng 3 và 4 trình bày API và kiểm thử. Bảng 5 cung cấp tài khoản demo."),
              PageBreak(), *content()]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    report = Report(str(args.out), pagesize=A4, leftMargin=53, rightMargin=53, topMargin=50, bottomMargin=60)
    report.multiBuild(story, onFirstPage=footer, onLaterPages=footer)
    print(args.out)




def content():
    roles = graphic(139, [
        ("Sinh viên", 16, 96, 100, 26), ("Giảng viên", 16, 55, 100, 26), ("Quản trị viên", 16, 14, 100, 26),
        ("Ghi danh, học, nộp bài, xem điểm", 216, 96, 243, 26),
        ("Quản lý lớp, học liệu, giao và chấm bài", 216, 55, 243, 26),
        ("Quản lý tài khoản và danh mục lớp", 216, 14, 243, 26),
    ], [(116, y, 216, y) for y in (109, 68, 27)])
    erd = graphic(180, [
        ("Users", 15, 145, 91, 25), ("Sessions", 15, 48, 91, 25),
        ("Courses", 175, 145, 101, 25), ("Enrollments", 175, 96, 101, 25),
        ("Assignments", 175, 48, 101, 25), ("Submissions", 175, 0, 101, 25),
        ("Lessons", 353, 145, 105, 25), ("Materials", 353, 96, 105, 25),
    ], [(106, 157, 175, 157), (60, 145, 60, 73), (105, 145, 175, 108), (225, 145, 225, 121),
        (175, 150, 154, 150), (154, 150, 154, 60), (154, 60, 175, 60), (225, 48, 225, 25),
        (276, 158, 353, 158), (276, 152, 353, 108), (405, 145, 405, 121), (73, 145, 142, 12), (142, 12, 175, 12)])
    database = [
        ("Collection", "Trường chính và quan hệ", "Chỉ mục / ràng buộc"),
        ("Users", "email, role, passwordHash, isActive", "Email duy nhất, chỉ mục role"),
        ("Courses", "courseCode, teacherId, category, status", "Mã lớp duy nhất"),
        ("Enrollments", "courseId, studentId, completedLessonIds", "Duy nhất theo sinh viên và lớp"),
        ("Lessons", "courseId, title, content, order", "Thứ tự theo khóa học"),
        ("Materials", "courseId, lessonId, type, file", "Loại PDF, video hoặc text"),
        ("Assignments", "courseId, teacherId, dueDate, maxScore", "Điểm tối đa từ 1 đến 1000"),
        ("Submissions", "assignmentId, studentId, score, published", "Duy nhất theo bài tập và sinh viên"),
        ("Sessions", "userId, expiresAt", "TTL theo thời gian hết hạn"),
    ]
    api = markdown_table("api.md", "| Method")
    test_groups = [
        ("Ca kiểm thử", "Kết quả quan sát", "Trạng thái"),
        ("TC01 · Xác thực", "JWT trong cookie. Đăng ký trùng 409. Sai mật khẩu hoặc thiếu phiên trả 401.", "PASS"),
        ("TC02 · Khóa học", "CRUD bản nháp đúng chủ. Trùng mã trả 409, trái quyền trả 403.", "PASS"),
        ("TC03 · Ghi danh", "Ghi danh trùng 409. Chưa ghi danh bị chặn. Hoàn thành lặp chỉ tính một lần.", "PASS"),
        ("TC04 · Tài liệu", "Tải PDF đúng byte. Chặn file PDF sai. Quản lý được video và bài đọc.", "PASS"),
        ("TC05 · Bài nộp", "Nộp text/TXT, cập nhật trước hạn và chặn nộp sai quyền hoặc quá hạn.", "PASS"),
        ("TC06 · Chấm điểm", "Chặn điểm ngoài miền. Điểm 0 được giữ. Ẩn điểm và nhận xét nháp.", "PASS"),
        ("TC07 · Quản trị", "Quản lý tài khoản, lớp, từ chối phiên bị khóa và thu hồi JWT khi logout.", "PASS"),
    ]
    report = [
        chapter("Chương 1. Tổng quan đề tài", "overview"),
        heading("1.1. Bối cảnh"),
        para("Một lớp học trực tuyến cần duy trì học liệu, danh sách ghi danh, thời hạn và kết quả qua nhiều buổi. Dữ liệu nằm ở nhiều kênh khiến sinh viên khó biết bài nào đã nộp và giảng viên mất thời gian đối chiếu bài làm với phản hồi. EduClass tổ chức các thao tác đó theo từng lớp, dựa trên tài khoản và quyền truy cập."),
        heading("1.2. Mục tiêu và phạm vi"),
        para("Đề tài xây dựng ứng dụng web MERN. Giảng viên quản lý khóa học, cung cấp học liệu, giao và chấm bài. Sinh viên đăng ký, tìm lớp, ghi danh, học, nộp bài và xem kết quả. Quản trị viên quản lý tài khoản và danh mục khóa học toàn hệ thống."),
        para("Dữ liệu lớp học, học liệu, ghi danh, bài tập, bài nộp và điểm được lưu trong MongoDB. Tệp nhị phân nằm trong kho tệp của máy chủ. Nội dung được truy cập qua API kiểm soát quyền."),
        heading("1.3. Sản phẩm triển khai"),
        para("Dự án gồm giao diện React tiếng Việt, API Express, schema Mongoose, dữ liệu mẫu, kiểm thử và tài liệu vận hành. Kết quả minh chứng được thu khi chạy với MongoDB Community và Chrome cục bộ."),
        PageBreak(),
        chapter("Chương 2. Cơ sở lý thuyết và công nghệ", "technology"),
        heading("2.1. MERN Stack"),
        para("<b>MongoDB</b> lưu document, còn Mongoose định nghĩa schema, validation, index và tham chiếu [6]. <b>Express</b> xử lý HTTP request bằng middleware và controller, đồng thời xử lý lỗi tập trung [5]. <b>React</b> tổ chức giao diện bằng component và Hooks. <b>Node.js</b> chạy máy chủ, script seed và bộ kiểm thử."),
        heading("2.2. REST và định dạng trao đổi"),
        para("API dùng tiền tố /api/v1. GET đọc tài nguyên, POST tạo hoặc thực hiện nghiệp vụ, PATCH cập nhật và DELETE xóa theo quy tắc. JSON là định dạng thông thường, biểu mẫu đính kèm dùng multipart/form-data và tải tệp trả dữ liệu nhị phân."),
        heading("2.3. Xác thực và phân quyền"),
        para("JWT [1] chứa các claim và được ký HS256. EduClass lưu JWT trong cookie HttpOnly và dùng MongoDB theo dõi phiên. Mỗi lần gọi API, backend kiểm tra chữ ký, phiên và trạng thái tài khoản. Sau đó, middleware áp dụng quyền theo vai trò và controller kiểm tra quyền sở hữu tài nguyên."),
        heading("2.4. Công cụ hỗ trợ"),
        para("Vite chạy và build frontend [7]. React Router điều hướng. Context chia sẻ hồ sơ và trạng thái xác thực [2]. Axios trao đổi dữ liệu. Tailwind CSS, Inter có bộ ký tự tiếng Việt và Lucide phục vụ giao diện. Zod kiểm tra dữ liệu, Multer nhận tệp và Helmet bổ sung header bảo mật."),
        PageBreak(),
        chapter("Chương 3. Phân tích yêu cầu hệ thống", "requirements"),
        para("Khách xem trang giới thiệu và danh mục lớp đang mở. Sau khi đăng nhập, các tác nhân truy cập tài nguyên theo vai trò và quan hệ với lớp."),
        roles, caption("Sơ đồ 1. Tác nhân và nhóm chức năng."),
        heading("3.1. Ma trận phân quyền"),
        table([
            ("Nghiệp vụ", "Sinh viên", "Giảng viên", "Quản trị viên"),
            ("Danh mục", "Xem lớp đang mở", "Xem lớp đang mở", "Xem và kiểm duyệt toàn hệ thống"),
            ("Nội dung", "Đọc khi đã ghi danh", "Quản lý trong lớp sở hữu", "Xem giới thiệu lớp"),
            ("Bài nộp và điểm", "Nộp và xem bài của mình", "Chấm và công bố trong lớp sở hữu", "Đổi trạng thái lớp"),
            ("Tài khoản", "Cập nhật họ tên", "Cập nhật họ tên", "Cấp tài khoản giảng viên, khóa hoặc mở"),
        ], [0.24, 0.23, 0.25, 0.28]), caption("Bảng 1. Phạm vi thao tác của ba vai trò."),
        heading("3.2. Ca sử dụng quan trọng"),
        para("<b>Ghi danh.</b> Sinh viên chọn lớp đang mở. Hệ thống kiểm tra quyền và trạng thái rồi tạo Enrollment. Ghi danh trùng hoặc lớp hết mở dẫn đến phản hồi xung đột."),
        para("<b>Nộp bài và nhận kết quả.</b> Sinh viên gửi bài làm trong lớp đã ghi danh. Giảng viên chọn bài nộp và chấm theo thang điểm. Sau khi điểm được công bố, sinh viên xem kết quả của mình."),
        heading("3.3. Yêu cầu phi chức năng"),
        para("Biểu mẫu có nhãn, trạng thái tải và lỗi rõ ràng. Giao diện hỗ trợ bàn phím và màn hình nhỏ. Backend kiểm tra dữ liệu và quyền trước khi ghi, giới hạn cỡ tệp và tần suất yêu cầu."),
        PageBreak(),
        chapter("Chương 4. Thiết kế hệ thống", "design"),
        heading("4.1. Kiến trúc tổng thể"),
        para("React gọi REST qua Axios. Khi phát triển, Vite proxy /api đến Express. Khi build, Express phục vụ frontend và API cùng origin. Mã backend tách Routes, Controllers, Models và middleware. Mongoose truy cập MongoDB. Kho upload nằm ngoài thư mục công khai."),
        heading("4.2. Thiết kế cơ sở dữ liệu"),
        erd, caption("Sơ đồ 2. Quan hệ giữa các collection. Enrollments và Submissions giữ các quan hệ nhiều-nhiều."),
        table(database, [0.18, 0.49, 0.33]), caption("Bảng 2. Schema, tham chiếu và chỉ mục."),
        PageBreak(),
        heading("4.3. Luồng xác thực, ghi danh và chấm điểm"),
        para("<b>Xác thực.</b> Backend dùng bcrypt để hash mật khẩu, tạo Session và phát JWT trong cookie. Chữ ký và phiên được kiểm tra ở mỗi yêu cầu bảo vệ. Logout xóa phiên. TTL dọn phiên hết hạn."),
        para("<b>Ghi danh.</b> Index duy nhất [3] chặn trùng cặp sinh viên và lớp. Danh sách bài đã hoàn thành cập nhật bằng $addToSet. Tiến độ dựa trên số bài còn hiệu lực đã hoàn thành chia tổng số bài còn hiệu lực."),
        para("<b>Nộp bài.</b> Server so hạn với thời điểm nhận bài. Lớp phải đang mở. Lần nộp đầu sau hạn phụ thuộc tùy chọn giảng viên. Nộp lại chỉ trước hạn khi bài chưa có điểm."),
        para("<b>Chấm điểm.</b> Giảng viên phải là chủ lớp. Điểm từ 0 đến mức tối đa cố định khi tạo bài. Điểm nháp và nhận xét nháp chỉ giảng viên thấy."),
        heading("4.4. Quan hệ và vòng đời"),
        para("Metadata tệp được nhúng vào tài nguyên sở hữu. Liên kết các collection dùng ObjectId. Lớp bản nháp chưa có ghi danh và bài tập chưa có bài nộp có thể được xóa mềm. Lớp đóng hoặc lưu trữ dừng nhận ghi danh và bài nộp, đồng thời giữ quyền đọc đã cấp để bảo toàn hồ sơ."),
        heading("4.5. Cấu trúc thư mục"),
        para("client/src chứa frontend, Auth Context, các page và Axios. server/src tách controllers, routes, models, middleware và seed. server/test kiểm thử tích hợp. docs chứa mô tả kỹ thuật và ảnh chụp, còn scripts chứa kiểm tra Chrome và trình tạo PDF."),
        PageBreak(),
        chapter("Chương 5. Triển khai hệ thống", "implementation"),
        heading("5.1. Màn hình và tính năng"),
        para("<b>Giảng viên:</b> Dashboard, CRUD khóa học, bài học có thứ tự, PDF/video/bài đọc, bài tập, danh sách lớp và bảng chấm điểm."),
        para("<b>Sinh viên:</b> Danh mục tìm kiếm theo tên hoặc mã, ghi danh, bài học, theo dõi tiến độ, nộp văn bản hoặc tệp và xem điểm đã công bố."),
        para("<b>Quản trị viên:</b> Lọc và phân trang, cấp tài khoản giảng viên, xác nhận khóa/mở người dùng và điều chỉnh trạng thái lớp."),
        heading("5.2. Kiểm soát tài khoản và tệp"),
        para("Cookie dùng HttpOnly, SameSite=Lax và Secure trong production [4]. API kiểm tra Origin khi ghi dữ liệu. File PDF/TXT giới hạn 8 MB, kiểm tra loại và nội dung, dùng tên lưu ngẫu nhiên. Tải tệp cần quyền tài nguyên tương ứng."),
        *shot(1, 235, label="5.1"), PageBreak(),
        heading("5.3. Bảng điều khiển thực tế"),
        *shot(4, label="5.2"), *shot(7, label="5.3"), PageBreak(),
        *shot(14, label="5.4"), *shot(19, label="5.5"), PageBreak(),
        chapter("Chương 6. Tài liệu API", "api"),
        para("Base URL /api/v1. Các thao tác thay đổi dữ liệu yêu cầu Origin khớp cấu hình. Thành công trả success, message và data. Lỗi trả success=false, message và errors. A là admin, G là giảng viên quản lý lớp, S là sinh viên. Các endpoint có tệp trả nhị phân."),
    ]
    for start in range(1, len(api), 12):
        if start > 1:
            report += [PageBreak(), heading("Danh sách endpoint (tiếp theo)")]
        report += [table([api[0], *api[start:start + 12]], [0.34, 0.19, 0.27, 0.20]),
                   caption(f"Bảng 3.{(start - 1) // 12 + 1}. Các endpoint REST API.")]
    report += [
        heading("6.1. Ví dụ và xử lý lỗi"),
        para("PATCH /submissions/:id/grade nhận score, feedback và published. Khi điểm 0 được công bố, response giữ data.score bằng 0. Điểm lưu nháp được ẩn với sinh viên. Mã lỗi chuẩn gồm 400 dữ liệu sai, 401 thiếu phiên, 403 thiếu quyền, 404 không tìm thấy, 409 xung đột, 413 tệp quá lớn, 429 quá tần suất và 500 lỗi máy chủ."),
        PageBreak(),
        chapter("Chương 7. Kiểm thử hệ thống", "tests"),
        para("API test chạy qua HTTP với Express và MongoDB Community 8.3. Môi trường Windows dùng Node.js 24. Kiểm thử giao diện dùng Playwright trên Chrome và dữ liệu demo."),
        table(test_groups, [0.27, 0.60, 0.13]), caption("Bảng 4. Kỳ vọng, quan sát và kết quả API."),
        heading("7.1. Kiểm tra trình duyệt"),
        para("Chrome kiểm tra sáu nhóm thao tác. Kịch bản nghiệm thu ba vai trò chạy bản build qua Express và MongoDB riêng, từ tạo lớp, ghi danh, tải PDF và nộp văn bản kèm tệp, đến công bố 9.25/10 và khóa/mở lại tài khoản. Trang chủ và dashboard được kiểm tra ở 375, 390, 768, 1024 và 1440 px. Không quan sát lỗi JavaScript, lỗi API 5xx hoặc tràn ngang trong các ca đã chạy."),
        heading("7.2. Lỗi đã sửa và giới hạn xác minh"),
        para("Kiểm thử phát hiện nhãn select có thể bị đọc kèm các lựa chọn. Giao diện liên kết nhãn bằng ID riêng. Lỗi tải PDF từ thư mục ẩn được sửa bằng root upload và kiểm thử hồi quy. ESLint, kiểm thử Node và Vite build chạy thành công. Trang chủ đạt Taste Skill Gate. Chưa đo tải lớn, quét tệp bằng antivirus hoặc chạy trên nhiều engine trình duyệt."),
        PageBreak(),
        chapter("Chương 8. Hướng dẫn cài đặt", "install"),
        heading("8.1. Chuẩn bị"),
        para("Cài Node.js 22.12+ hoặc 24 LTS, npm, Git và MongoDB Community, hoặc dùng MongoDB Atlas. Clone repository đích hoặc giải nén mã nguồn rồi mở terminal tại thư mục gốc."),
        heading("8.2. Khởi chạy"),
        para("<b>Bước 1.</b> Chạy npm ci. Sao chép server/.env.example thành server/.env. Đặt MONGODB_URI, JWT_SECRET ngẫu nhiên ít nhất 32 ký tự và CLIENT_URL."),
        para("<b>Bước 2.</b> Chạy npm run seed để nạp dữ liệu mẫu. Chạy npm run dev và mở http://localhost:5173/. API mặc định dùng cổng 5000."),
        para("<b>Bước 3.</b> Chạy npm run lint, npm test và npm run build. Có thể chạy node scripts/browser-check.mjs với Chrome và dữ liệu seed để kiểm tra lại."),
        table([
            ("Vai trò", "Email demo", "Mật khẩu demo"),
            ("Quản trị viên", "admin@educlass.example", "EduClass!2026"),
            ("Giảng viên", "teacher1@educlass.example", "EduClass!2026"),
            ("Sinh viên", "student1@educlass.example", "EduClass!2026"),
        ], [0.23, 0.49, 0.28]), caption("Bảng 5. Tài khoản dùng cho MongoDB demo."),
        heading("8.3. Build và nộp bài"),
        para("Sau npm run build, npm start phục vụ giao diện và API cùng origin. Production cần HTTPS và cấu hình origin, MongoDB, thư mục tệp phù hợp. Nộp báo cáo cùng URL repository thực tế. Với repository private, cấp quyền truy cập cho giảng viên. File .env, node_modules, dữ liệu cục bộ, file upload và báo cáo chứa MSSV được loại trừ khỏi Git."),
        PageBreak(),
        chapter("Chương 9. Kết luận và hướng phát triển", "conclusion"),
        heading("9.1. Kết quả đạt được"),
        para("EduClass triển khai ba vai trò và các luồng lõi của đề bài trên dữ liệu MongoDB thật. REST API hỗ trợ ghi danh, học liệu, nộp bài, chấm điểm và quản trị. Bộ kiểm thử xác minh cả trường hợp thành công lẫn lỗi quyền và dữ liệu."),
        para("Ma trận trong docs/traceability.md đối chiếu đề bài với màn hình, API, model và kết quả. Báo cáo PDF và mã nguồn đã được chuẩn bị. Repository đích của nhóm là <link href='https://github.com/NguyenVuMinhTien/educlass-mern' color='#174D4B'>NguyenVuMinhTien/educlass-mern</link>."),
        heading("9.2. Hạn chế và hướng phát triển"),
        para("File hiện nằm trên máy chủ ứng dụng. Nhiều máy chủ cần kho tệp dùng chung, quản lý giới hạn tần suất tập trung và sao lưu đồng bộ. Có thể mở rộng khôi phục mật khẩu, nhắc hạn, phân tích kết quả học tập và kiểm thử tải."),
        PageBreak(),
        chapter("Tài liệu tham khảo", "references"),
    ]
    sources = [
        ("[1] RFC Editor. JSON Web Token (JWT), RFC 7519.", "https://www.rfc-editor.org/rfc/rfc7519"),
        ("[2] React. Scaling Up with Reducer and Context.", "https://react.dev/learn/scaling-up-with-reducer-and-context"),
        ("[3] MongoDB. Unique Indexes.", "https://www.mongodb.com/docs/manual/core/index-unique/"),
        ("[4] MDN. Set-Cookie.", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie"),
        ("[5] Express. Error Handling.", "https://expressjs.com/en/guide/error-handling/"),
        ("[6] Mongoose. Schemas.", "https://mongoosejs.com/docs/guide.html"),
        ("[7] Vite. Getting Started.", "https://vite.dev/guide/"),
    ]
    for label, url in sources:
        report.append(para(f'{escape(label)}<br/><link href="{escape(url)}" color="#174D4B">{escape(url)}</link>'))
    report += [PageBreak(), chapter("Phụ lục. Ảnh minh chứng", "evidence")]
    for i, number in enumerate([2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18]):
        if i and i % 2 == 0:
            report.append(PageBreak())
        report.append(KeepTogether(shot(number, label=f"A.{i + 1}")))
    phones = Table([[shot(20, 490, WIDTH * 0.43, "A.15"), shot(21, 490, WIDTH * 0.43, "A.16")]], colWidths=[WIDTH / 2] * 2)
    phones.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return [*report, PageBreak(), heading("Giao diện trên điện thoại"), phones]


if __name__ == "__main__":
    main()

# PRD-0 · Đảo Đèn Lồng

> Nguồn: Lab board Phase 1. Tag nộp: `phase-1`. Contract: v1.0. ~60 phút.

Bản mô tả đầu tiên từ khách hàng. Phần yêu cầu cố ý ở mức tổng quát. Phần Test Contract v1.0 là bắt buộc và chính xác.

## 1. Chúng tôi muốn gì

Game 3D **Đảo Đèn Lồng**. Người chơi điều khiển **Mây**, người giữ đèn nhỏ tuổi trên đảo giữa biển mây. Sương đen đã nuốt ánh sáng. Mây thu thập **đom đóm**, mang về thắp **Đèn Lồng Lớn**. **Bóng Mực** đuổi theo; chạm thì mất máu (flames). Mây có thể **tỏa sáng (pulse)** để xua chúng (tốn ánh sáng). Bóng Mực sợ đèn. Thắp hết đèn = thắng. Hết máu = thua. Có điểm số.

## 2. Phạm vi Phase 1

- Một màn: **Đêm 1 – Đảo Bến**, đảo tròn, **5 Đèn Lồng Lớn**
- Đi, nhảy, camera 3D
- Đom đóm rải rác, nhặt được
- Nạp ánh sáng vào đèn để thắp
- Bóng Mực xuất hiện và đuổi
- Tỏa sáng xua Bóng Mực
- Thắng / thua / điểm / HUD
- Chơi lại sau thắng/thua

## 3. Cảm giác & phong cách

Đêm ấm, cổ tích; đảo sáng dần; vàng cam = tốt; tím đen = nguy hiểm; đồ họa đơn giản; Mây đội nón lá + đèn nhỏ; không bạo lực/máu me. Sáng tạo thêm được khuyến khích nhưng không đổi đầu ra headless.

## 4. Công nghệ

Tự chọn. Chạy được trên macOS/Linux (Windows: Docker hoặc web).

## 5. Bàn giao Phase 1

Tag `phase-1`; game chơi được; README ≤3 lệnh; `game.contract.json` + headless; bằng chứng; harness AI.

## 6. Lưu ý

Đúng yêu cầu > phức tạp. Có bằng chứng. Chỗ mơ hồ → giả định và ghi lại.

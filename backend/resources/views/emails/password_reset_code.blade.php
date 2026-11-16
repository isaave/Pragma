<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redefinição de senha - Pragma</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
                    <tr>
                        <td style="background-color:#0f172a;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
                            <img src="{{ $message->embed(resource_path('views/emails/images/logo-house-burguer.png')) }}"
                                 alt="House Burguer"
                                 width="96"
                                 style="display:block;width:96px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;border-radius:50%;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Redefinição de senha</h2>
                            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:24px;">Olá,</p>
                            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:24px;">Recebemos um pedido de redefinição de senha para a sua conta no Pragma.</p>
                            <p style="margin:0 0 8px;color:#475569;font-size:15px;line-height:24px;">O seu código de acesso é:</p>
                            <div style="margin:0 0 10px;padding:16px;background-color:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;text-align:center;">
                                <span style="font-family:Courier,monospace;font-size:32px;font-weight:800;color:#0f172a;letter-spacing:8px;user-select:all;-webkit-user-select:all;">{{ $code }}</span>
                            </div>
                            <p style="margin:0 0 24px;color:#94a3b8;font-size:12px;line-height:18px;text-align:center;">Toque e segure no código (ou selecione e use Ctrl+C / Cmd+C) para copiar.</p>
                            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:24px;">Este código é válido por 15 minutos.</p>
                            <p style="margin:0 0 32px;color:#475569;font-size:15px;line-height:24px;">Se não fez este pedido, ignore este e-mail.</p>
                            <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">Cumprimentos,<br>Equipa Pragma</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:20px;text-align:center;">
                            <p style="margin:0;color:#64748b;font-size:12px;">&copy; 2026 Pragma &mdash; Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

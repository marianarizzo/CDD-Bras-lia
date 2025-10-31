# Gestão de Selos - PWA (v7) — Firebase + Email + Dev exclusivo

- Dev exclusivo: **Nome: Mariana Rizzo / Senha: adm123** (única com acesso a "Cadastro de Pessoas").
- Admin: senha **adminselos** (sem acesso ao cadastro de pessoas).
- Colaborador: sem senha.

## E-mails (SendGrid) (opcional)
cd functions
npm install
firebase functions:config:set sendgrid.key="SUA_SENDGRID_KEY" app.from="no-reply@seu-dominio.com"
firebase deploy --only functions

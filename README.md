# Gestão de Selos - PWA (v6 FULL com Firebase + Email)

1) Edite `config.js` (já preenchido com seu firebase).
2) Ative o Firestore no console.
3) Sirva a pasta (python http.server) ou publique no GitHub Pages.
4) (Opcional) Envie e-mails configurando `functions/` com SendGrid:
   - `cd functions && npm install`
   - `firebase functions:config:set sendgrid.key="SUA_SENDGRID_KEY" app.from="no-reply@seu-dominio.com"`
   - `firebase deploy --only functions`

# Eco Denúncia — Ionic 9 + Angular 22 (standalone) + Firebase

App de denúncias ambientais: login (e-mail e Google), mural compartilhado, denúncia com **foto (Cloudinary)** e
**local (texto + mapa)**. O **autor** e o **admin** editam; só o admin muda o status. Hospedagem no Firebase Hosting.

Node **22.23.1** · Ionic **9** · Angular **22** · `firebase` (SDK modular) · `leaflet` (mapa OpenStreetMap, sem chave)

## O que você precisa fazer (só você consegue: são as suas contas)

### 1) Firebase
1. Console Firebase → crie o projeto → **Adicionar app Web** → copie o `firebaseConfig`.
2. Cole em **`src/environments/environment.ts`** *e* **`src/environments/environment.prod.ts`**
   (o build de produção usa o `.prod`; as duas precisam das mesmas chaves).
3. **Authentication → Sign-in method**: ative **E-mail/senha** e **Google**.
   Em *Settings → Authorized domains* confirme `localhost` e adicione o domínio do Hosting.
4. **Firestore Database** → criar banco.
5. Publique as regras (**antes do primeiro uso**, senão o mural não carrega):
   ```bash
   npm i -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc      # troque SEU_PROJETO pelo ID do projeto
   firebase deploy --only firestore:rules
   ```

### 2) Cloudinary (fotos)
Settings → Upload → **Upload presets → Add upload preset** com **Signing mode: Unsigned**
(sugestão: só imagens, tamanho máximo, pasta `eco-denuncia`).
Preencha `cloudName` e `uploadPreset` nos **dois** arquivos de environment.

### 3) Rodar e publicar
```bash
npm start                 # ou: ionic serve  → http://localhost:4200
npm run build             # gera ./www (já configurado em firebase.json)
firebase deploy --only hosting
```

### Tornar alguém Admin
O app cria `usuarios/{uid}` com `role: "user"` no primeiro login. No Console → Firestore → coleção
`usuarios` → documento da pessoa → mude `role` para `admin`. As regras impedem que alguém se promova pelo app.

## Mapa dos issues → código

| Issue | Onde |
|---|---|
| S1 Criar o app / Login e cadastro | `src/main.ts`, `pages/login`, `services/auth.service.ts`, `guards/auth.guard.ts` |
| S2 Models / Service | `models/`, `services/denuncia.service.ts` (`providedIn: 'root'`) |
| S3 Input e Output / Lista | `components/denuncia-card` (`@Input` + `@Output`), `pages/lista` |
| S4 Regra do tema / Firestore | `DenunciaService.validarEnvio()`, `pages/nova-denuncia`, `criar()` / `atualizar()` |
| S5 Visual / Extra | `theme/variables.scss`, `global.scss`; extra: confirmação antes de enviar/excluir + apoio "+" |

> Os templates usam `@if` / `@for` (controle de fluxo nativo). O `eslint.config.js` do projeto (Angular 22)
> rejeita `*ngIf` / `*ngFor`; `npm run lint` passa limpo.

## Modelo de dados (Firestore)
- `usuarios/{uid}`: `nome`, `email`, `role` (`user` | `admin`)
- `denuncias/{id}`: `titulo`, `tipo` (`agua|ar|solo|outros`), `descricao`, `fotoUrl`, `localTexto`, `lat`, `lng`,
  `status` (`aberta|em_analise|resolvida`), `autorId`, `autorNome`, `apoiadores[]`, `criadoEm`, `atualizadoEm`

## Regra do print (tela 2)
Foto e local são obrigatórios. Sem eles o botão fica cinza/desabilitado e aparece
`Envio bloqueado: inclua foto e local` (a mensagem lista exatamente o que falta). A regra mora no service, não no HTML.

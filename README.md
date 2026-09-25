# RelayOps MVP

Dashboard operacional local-first construído como demonstração profissional de **Teagarden + OverClick + OpenCode**.

## Executar

```bash
npm install
npm run dev
```

Acesse `http://127.0.0.1:5173`.

## Validar

```bash
npm run check
# Em outro terminal, com o servidor ativo:
npm run prove:browser
```

O MVP oferece CRUD de tickets, busca, filtros, mudança de status, métricas derivadas, persistência local, importação/exportação JSON e reset seguro. Veja o processo completo em [`TUTORIAL.md`](./TUTORIAL.md).

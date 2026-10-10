# Seven Tour 360

Código do editor de tours panorâmicos: até 100 fotos, setas de navegação, ângulo inicial, substituição/exclusão de fotos, Seven Sports Bar e Seven Poker Room e compartilhamento por URL/iframe.

## Estado da transferência

Esta cópia corresponde à aplicação atualmente publicada em ChatGPT Sites, no commit de origem 3f0212d41b04f82de5cfc58df318b14180c25a03. Usa Vinext/Cloudflare Workers, R2 e D1; ainda não está adaptada para publicar diretamente na Vercel.

Aplicação atual: https://vertice-tour-360.verticeimoveisbc.chatgpt.site

O código foi transferido. Dados, imagens de produção, senhas e variáveis privadas NÃO fazem parte deste repositório. A migração do banco e da hospedagem ainda não foi realizada.

## Pendências para Vercel/Supabase

1. Permitir a criação do projeto seventour360 na Vercel. A integração retornou 403 (sem permissão de criação).
2. Cadastrar a chave privada do Supabase no ambiente do novo projeto. A chave existente em Plugora está marcada como secreta e não pode ser lida para cópia.
3. Adaptar o runtime para Next.js, Postgres e Supabase Storage. O envio de panoramas deverá ser direto ao Storage com autorização assinada para suportar até 20 MB por foto.
4. Inventariar e migrar os tours e as imagens existentes, preservando o site atual até validar o destino.
5. Verificar login, 100 imagens, navegação, edição, publicação e iframe na nova hospedagem antes de concluir a transferência.

## Estrutura

- app/page.tsx: painel de edição, upload e publicação.
- app/viewer.tsx: visualizador panorâmico WebGL e setas.
- app/api: APIs do runtime original.
- lib/studio-auth.ts: autenticação por cookie assinado; STUDIO_AUTH deve ser uma variável privada do servidor.
- tests/api.test.mjs: testes das APIs originais.
- ORIGINAL-README.md: instruções do ambiente original.

A configuração de vínculo com o projeto ChatGPT Sites e os arquivos gerados de compilação foram omitidos. Não inserir credenciais no código nem no GitHub.

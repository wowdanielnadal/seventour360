# Seven Tour 360

Editor de tours com panoramas 360°, até 100 fotos por tour, setas de navegação, ângulo inicial por cena, substituição e exclusão de imagens, grupos Seven Sports Bar e Seven Poker Room e compartilhamento por URL/iframe.

## Estado da transferência

Este repositório recebe o código da versão atualmente publicada em ChatGPT Sites. Essa versão usa Vinext/Cloudflare Workers, R2 para imagens e tours e D1 para limitação de tentativas de login. Ainda não é uma aplicação compatível com publicação direta na Vercel.

A migração para Vercel e Supabase está pendente. A aplicação atual permanece em https://vertice-tour-360.verticeimoveisbc.chatgpt.site.

Não foram incluídos senhas, variáveis de ambiente, imagens privadas nem dados de produção. Copiar o código não transfere os dados armazenados em R2/D1.

## Próxima etapa

- Cadastrar SUPABASE_SERVICE_ROLE_KEY nas variáveis privadas do projeto seventour360 da Vercel (Production).
- Adaptar o servidor para Next.js, Postgres e Supabase Storage, com upload direto assinado para suportar fotos de até 20 MB.
- Transferir os tours e imagens existentes e verificar login, edição, navegação, publicação e iframe antes da troca definitiva.

## Código atual

O arquivo ORIGINAL-README.md contém as instruções do runtime original. O código de interface está em app/page.tsx e app/viewer.tsx; APIs em app/api; autenticação em lib/studio-auth.ts. A configuração STUDIO_AUTH é fornecida somente pelo servidor e não está no repositório.

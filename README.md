# Seven Tour 360

Editor de tours panorâmicos para Next.js na Vercel e Postgres/Storage no Supabase. Até 100 fotos por tour, setas de ida/volta, ângulo inicial, exclusão/substituição e compartilhamento por URL/iframe. Seven Sports Bar e Seven Poker Room podem ser mostrados juntos ou separadamente.

## Configuração de hospedagem

Projeto Vercel: https://vercel.com/danielnadal/seventour360

Em Settings → Environment Variables, cadastrar `SUPABASE_SERVICE_ROLE_KEY` como Secret, somente no servidor. Nunca usar prefixo NEXT_PUBLIC nem inserir essa chave no GitHub. Ativar Production e o Preview desta migração somente enquanto ele estiver sendo validado; retirar o acesso dos previews depois da conclusão.

`SUPABASE_URL` tem o padrão `https://usyzbhycrvrdiicrsolu.supabase.co` e pode ser substituído por variável de ambiente. O projeto Supabase é Plugora; somente tabelas `seven_*` e o bucket privado `seven-tour-360` são usados por este aplicativo.

O acesso do estúdio é independente do ChatGPT. As configurações privadas ficam em `seven_settings`, com hash scrypt da senha e segredo de sessão. Não há login via cabeçalhos ChatGPT. Não cadastrar esses valores no frontend. `STUDIO_AUTH` é uma substituição opcional para testes/desenvolvimento.

## Estado da migração

- Backend adaptado de Cloudflare/R2/D1 para Next.js/Supabase.
- Schema e bucket criados no projeto Supabase autorizado.
- Conta do estúdio configurada no banco privado.
- Compilação Next.js e testes de contrato com 100 autorizações de upload passaram localmente. Storage é simulado nos testes; não equivalem a 100 uploads reais no destino.
- Ainda é necessário configurar a chave privada na Vercel, fazer redeploy e verificar ponta a ponta antes de declarar a aplicação operacional.
- Site anterior permanece ativo até essa verificação. A publicação de uma prévia não conclui a transferência.

## Upload e acesso

A Vercel emite uma autorização de upload após verificar sessão e propriedade do tour. O navegador envia o arquivo diretamente ao Supabase, evitando passar arquivos de 20 MB pelo corpo das Functions. O bucket aceita JPG/PNG/WebP até 20 MB. Miniaturas são geradas no navegador e panoramas maiores são otimizados para até 8192×4096. O cliente valida panoramas completos na proporção 2:1.

Tabelas têm RLS ativado e permissões de anon/authenticated revogadas. As APIs validam o cookie de sessão e o dono do tour. Visitantes podem acessar apenas tours publicados. URLs de leitura de imagens expiram em 60 segundos; ao despublicar, um link assinado já emitido pode continuar válido por esse intervalo. Uploads assinados expiram em duas horas e não permitem sobrescrita.

O painel pode retomar o envio a partir das fotos já salvas. Uma falha entre upload e gravação pode deixar um arquivo sem referência, que fica privado e é removido ao excluir o tour. Não há garantia de retomada parcial de bytes de um arquivo.

## Desenvolvimento

Node.js 22.13 ou superior:

```sh
npm ci
npm test
npm run build
npm run dev
```

Copiar `.env.example` para `.env.local` e preencher a credencial em ambiente protegido. A migração SQL está em `supabase/migrations`; não reaplicar no projeto onde já foi executada. Não copiar dados ou alterar tabelas de outros aplicativos do Plugora.

## Edição em outra conta

O código pertence ao repositório GitHub `wowdanielnadal/seventour360`. Para editar por outra conta ChatGPT/Codex, conecte o GitHub com acesso a este repositório e a Vercel/Supabase quando for necessário publicar ou alterar dados. Isso não transfere automaticamente a conversa ou o artefato original de ChatGPT Sites para outra conta.

## Verificação

`npm test` cobre login, cookies, rejeição de cabeçalhos forjados, origem, limite de tentativas, 100 autorizações de upload/salvamentos, rejeição de 101 fotos, ângulos, setas, grupos 50/50, privacidade, exclusão e conflitos de revisão, com armazenamento simulado.

Verificações no banco confirmaram RLS, revogação de leitura das configurações por anon/authenticated, execução restrita do limitador e bucket privado. O aviso informativo de RLS sem política nessas tabelas é intencional: somente o backend com service_role as acessa. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

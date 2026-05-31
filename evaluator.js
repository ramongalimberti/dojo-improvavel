// evaluator.js v2 — avaliação turno-a-turno + dica do lead + relatório final
// Detecta: passo atual do Caminho de 18, técnicas aplicadas, tonalidades, armadilhas

const Evaluator = (() => {

  function buildEvaluatorSystem({ data }) {
    // System prompt puramente estático → empacota em block array com cache_control
    // pra Anthropic cachear (TTL 5 min, custo de leitura ~10% do input normal).
    return [{
      type: 'text',
      cache_control: { type: 'ephemeral' },
      text: `Você é coach L99 de vendas consultivas high-ticket, especializado no público Improvável (Aliança Divergente — Teoria da Permissão).

Sua função: avaliar UMA resposta do Ramon numa chamada 1×1 pós-evento, contra o Caminho de 18 passos + rubrica de 5 dimensões + armadilhas críticas.

CALIBRAÇÃO OBRIGATÓRIA — alinhamento com a DICA DO TURNO:
- Se o contexto incluir um "LEAD_HINT_ANTERIOR" (dica gerada ANTES do Ramon responder, com \`resposta_nota_10\` e \`tecnicas_sugeridas\`), use isso como gabarito oficial.
- Se a resposta do Ramon for SEMELHANTE em conteúdo e estrutura à \`resposta_nota_10\` da dica (mesmas técnicas, mesmo passo, mesma intenção — mesmo que a redação varie): **nota_geral = 10.0 OBRIGATÓRIO**, TODAS as 5 dimensões em "notas" = 10, e as técnicas em \`tecnicas_sugeridas\` devem ser marcadas TRUE em \`tecnicas_aplicadas\` (havendo evidência). Nada de "9.5 porque daria pra melhorar X" — se o Ramon bateu a nota-10, é 10.
- Se a resposta for MUITO BOA mas com um detalhe real pra ajustar (falta uma técnica clara, uma palavra que pesou errado, um passo pulado), nota 8.5-9.5 com ajuste específico. Evite "9.5 genérico" — ou é 10 (sem ajuste) ou é ≤9.5 com AJUSTE CONCRETO apontado.
- REGRA DE OURO DO AJUSTE: se você PENSAR em marcar 9.5, pergunte "qual é o ajuste?". Se não conseguir NOMEAR um ajuste concreto (substitua-se-por-isso-literal), então é 10. Nota 9.5 SEM ajuste é proibida.
- Se o Ramon executou o \`passo_do_caminho_sugerido\` da dica de forma coerente, marque esse passo como \`passo_do_caminho_executado\` e NÃO exija que ele tenha pulado à frente. Um turno bem executado = UM passo bem cumprido. Não penalize por "não ter ido ao passo seguinte" se o passo atual foi bem feito.
- A dica é uma PROMESSA para o Ramon. Se ele seguir a dica, ele precisa ser recompensado. Divergência entre dica e avaliação quebra a confiança no coach.
- Se a resposta do Ramon divergir da dica (outra técnica, outro passo) mas for BOA, avalie normalmente. Se divergir e for PIOR, penalize e explique claramente.

REGRA DE RITMO DO CAMINHO (CRÍTICA — chamada real tem 15-25 turnos):
- Turno 1-3: fase ABERTURA, passos 1-3 (Permissão/Agradecimento/Conexão-com-evento). NÃO exija Pergunta de Implicação ainda. NOMEAR PADRÃO (Salvador/Dependência/etc.) no turno 1-2 é PREMATURO — penalize Fidelidade e Investigação.
- Turno 4-8: fase INVESTIGAÇÃO, passos 4-7 (Situação/Problema/Implicação/Necessidade de Solução).
- Turno 9-12: fase APRESENTAÇÃO, passos 8-10 (3 Dez/Storytelling/Pre-handling). Nomear Marca Passos / estrutura do programa SÓ a partir daqui.
- Turno 13-18: fase FECHAMENTO, passos 11-18 (Looping/Isolamento/Ancoragem de Preço/Close/Avanço/Risco Reverso). Ancoragem de preço ANTES do turno 12 é PREMATURO.
- Pular passos quebra a venda. Cumprir 1 passo por turno com profundidade vale MAIS que tocar 3 passos superficialmente.

VIOLAÇÃO DE RITMO (penalidades OBRIGATÓRIAS):
- Ramon NOMEOU PADRÃO no turno 1-2 (ex: "você é o Salvador") sem passar por Permissão/Conexão antes → Fidelidade ≤ 6, Investigação ≤ 6. Ajuste: "ir mais devagar, pedir permissão pra cavar, escutar o evento gatilho primeiro."
- Ramon APRESENTOU MARCA PASSOS / estrutura do programa antes do turno 8 → Apresentação ≤ 5. Ajuste: "ainda está investigando; apresentação vem depois de 3 Perguntas de Implicação boas."
- Ramon ANCOROU PREÇO antes do turno 10 → Fechamento ≤ 5. Ajuste: "preço entra depois que o valor da mudança foi estabelecido e depois do isolamento."
- Ramon TENTOU CLOSE (Assumptive/Alternative/Risco Reverso) antes do turno 10 → Fechamento ≤ 4 + armadilha_cometida = "fechou_sem_apresentar".
- EXCEÇÃO: se o sub-modo é "fechamento", "quebra" ou "duvidas", a sessão começa DEPOIS da abertura e essas penalidades se deslocam (ex: no "quebra", a ancoragem pode vir no turno 3-4 porque o lead já começou com objeção declarada). No sub-modo "caminho_completo", aplica integral.

CONTEXTO DO LEAD — nível de conhecimento da metodologia:
O lead chega depois de live/aulas/conteúdo da Aliança. NÃO é tábula rasa. O nivel_conhecimento_metodologia do cenário tem 3 valores:
- **cru**: usa linguagem própria. Ramon pode/deve apresentar o conceito pela primeira vez.
- **exposto**: JÁ USA termos como "Padrão", "Permissão", "Teto Financeiro", "Ciclo do Quase" etc. com naturalidade. Dúvida típica é sobre COMO APLICAR. Nesse caso, Ramon NÃO deve explicar o conceito como se fosse inédito (isso subestima o lead e soa condescendente). Deve DEEPEN: personalizar o conceito com dado específico do lead, nomear qual variação/camada (ex: "é um Padrão de Relacionamento, não de Acontecimento"), ou redirecionar pra aplicação.
- **estudioso**: usa termos com precisão, pode desafiar. Risco de Obesidade Intelectual — Ramon deve CONFRONTAR ("entender o padrão não rompe o padrão") e levar pra AÇÃO.

REGRA DE AVALIAÇÃO CALIBRADA:
- Se o lead é EXPOSTO/ESTUDIOSO e Ramon explicou o conceito como se fosse novo ("Permissão é a autorização inconsciente pra..."), PENALIZE Fidelidade (soa paternalista, quebra rapport).
- Se o lead é EXPOSTO/ESTUDIOSO e Ramon DEEPENOU (citou a sub-camada, personalizou com dado do lead, confrontou Obesidade Intelectual, levou pra "como aplicar"), BONIFIQUE Fidelidade.
- Se o lead é CRU e Ramon nomeou o conceito pela primeira vez de forma acessível, BONIFIQUE.

POSTURA DE CONDUÇÃO DO VENDEDOR (MAIORIA DOS LEADS É CRU/EXPOSTO — 90%):
O lead é dono da DOR, não da teoria. QUEM CONDUZ É O VENDEDOR. O bom Ramon:
- ESCUTA a dor em linguagem comum do lead.
- TRADUZ pra conceito da Teoria da Permissão (nomeia em linguagem simples).
- AMARRA conceitos soltos em uma narrativa única que o lead consegue reconhecer ("então o que tá acontecendo é isso: seu Padrão Relacional com sua mãe trava sua Permissão de Ganhar Mais — é o mesmo laço que aparece quando você...").
- Faz isso tudo em LINGUAGEM SIMPLES, voz de mesa de jantar, sem jargão academicista.
BONIFIQUE Fidelidade quando o Ramon traduz dor→conceito e amarra 2+ conceitos de forma acessível pro lead.
PENALIZE quando o Ramon espera o lead trazer o diagnóstico pronto OU quando despeja jargão técnico sem traduzir.

REGRA DE PAUSAS NO TEXTO DO RAMON (marcadores intencionais):
- "..." (três pontos) = pausa curta natural (hesitação técnica, 4 Segundos curto, respiração). NÃO é filler nem falta de confiança — é técnica.
- "...N" (com N=1..9, ex: "...5") = pausa/silêncio de N segundos aplicado DELIBERADAMENTE. É Silêncio Dinâmico / Regra dos 4 Segundos / pausa de pressão.
- Quando detectar "..." ou "...N" no meio da resposta do Ramon, marque a técnica correspondente como TRUE (silencio_dinamico, 4_segundos quando N≈4) e BONIFIQUE Escuta/Fechamento conforme o contexto.
- NÃO interprete "..." ou "...N" como resposta truncada, erro de digitação ou insegurança. É marcador intencional do sistema.
- NÃO PENALIZE a ausência de pausa no FINAL da resposta do Ramon (após a última palavra). O silêncio pós-resposta é natural do turn-taking da chamada — é o espaço pro lead responder. Só avalie pausas que estejam NO MEIO da resposta (posicionadas como técnica).

FONTE DE VERDADE — Caminho de 18 passos:
${JSON.stringify((data.caminho_18_passos?.passos || []).map(p => ({
  numero: p.numero,
  fase: p.fase,
  nome: p.nome,
  tecnica: p.tecnica,
  autor: p.autor,
  sinais_de_deteccao: p.sinais_de_deteccao,
  armadilha: p.armadilha,
  is_alavanca_maxima: p.is_alavanca_maxima || false
})))}

TÉCNICAS BONIFICADAS (detectar quais o Ramon aplicou):
${JSON.stringify((data.tecnicas_compendio?.tecnicas || []).map(t => ({
  id: t.id,
  nome: t.nome,
  autor: t.autor,
  tier: t.tier,
  sinais: t.exemplo
})))}

CONCEITOS CANÔNICOS DA TEORIA DA PERMISSÃO (priorizados pra chamada 1×1 pós-evento):

FUNDAMENTOS (sempre no radar):
- **Permissão** — autorização inconsciente pra ter/ser/fazer/ir. Não é motivação nem capacidade. Opera em 3 áreas: Financeiro, Relacionamento, Saúde. Frase-âncora: "Você não foi mais longe porque não pôde — ainda."
- **CDP (Capacidade + Disposição + Permissão)** — se C+D=SIM e resultado=NÃO, causa é Permissão. Frame de abertura / diferenciação.
- **PDA (Perceber + Decidir + Agir)** — toda mudança passa por 3 em ordem obrigatória. Distinção crítica: PDA Descontrolado (Padrão no comando) vs. PDA Memorável (consciente + com DATA). "Um PDA sem data é um sonho disfarçado de plano."

DIAGNÓSTICO CENTRAL:
- **Padrões** — conceito estrutural. Tem 3 dimensões SEMPRE juntas: Acontecimento (o fato) + Comportamento (a reação) + Relacionamento (as pessoas/CPFs). E 3 camadas: Mostrar → Desenvolver → Diplomar. Frase-âncora: "Entender o padrão não rompe o padrão."
- **Matriz da Utilidade** — todo problema persiste porque TEM UTILIDADE inconsciente. 4 quadrantes: Punir / Poupar / Unir / Afastar. Pergunta-chave: "quando esse problema aconteceu, pra quem você ligou?"
- **Pré-Queda** — período que antecede o rompimento. 4 gatilhos (Vontade→Dúvida→Decisão→Desistência, 24h entre eles). 3 Ps do Elton (Precisa/Permite/Prefere). Sempre revela 2 padrões juntos: Acontecimento + Relacionamento.

PADRÕES RELACIONAIS (trava da Permissão):
- **Dependência Emocional** — def. canônica Elton: "quando a ação/estado de uma pessoa passa a interferir na ação/estado de outra". Gera 5 Danos: Medo, Culpa, Desânimo, Insegurança, Procrastinação. "Toda demora nos resultados esconde uma espera nas relações."
- **3 Perfis Controladores** — Vítima (usa PRESENTE) / Vingador (usa PASSADO) / Narcisista (usa QUALQUER TEMPO). Mutações previsíveis: Vítima→Vingador quando confrontada; Vingador→Vítima; Narcisista→Vítima ou intensifica. SEM "Salvador" (não canônico — é manifestação do Narcisista).
- **Combinados** — acordos (conscientes ou não) que atuam como lei interna. 3 subtipos problemáticos: Inconsciente Velado / Vencido / Desesperado.

FINANCEIRO:
- **Teto Financeiro + CPF** — limite invisível de renda; carrega CPF da pessoa que te aciona quando você chega no topo. Marcador externo da Pré-Queda. Diagnóstico: "pra onde você iria se não tivesse pra onde ir? Quem é que sempre corre pra você?"

DIAGNÓSTICOS EVOLUTIVOS:
- **Escada da Maturidade** — 5 degraus: Afeto → Reconhecimento → Recompensa → Sentido → Legado. Trava típica: quer Recompensa operando no Reconhecimento. Armadilha: Sentido/Legado prematuro como FUGA de Recompensa.
- **Escada da Postura** — 5 degraus. Comum: Reclamar / Justificar. Divergente: Questionar o COMO (não o "por quê") / Propor / Aplicar.

APELIDOS COMERCIAIS (use pra rapport; saiba o nome canônico):
- **Mula de Carga** → canônico: **Permissão Represada + Distúrbio de Prioridade**
- **Salvador** (alt: Herói da Família) → canônico: **Dependência Emocional + Culpa (4 Tipos do APF_09) + Efeito Paralelo negativo da prosperidade** — quem se vê como o salvador/a salvadora da família, carrega o peso dos outros, não pode deixar ninguém pra trás
- **Ciclo do Quase** → canônico: **Pré-Queda recorrente em série**
- **Festa no Banheiro** → canônico: **Dependência Emocional + 3 Perfis Controladores simultâneos**
- **Obesidade Intelectual** → canônico: **Confusão Capacidade/Permissão + "Entender o padrão não rompe o padrão"**
- **Medo do Brilho / Ficar Rico** → canônico: **Dependência Emocional + Teto Financeiro + Escada da Maturidade presa no Afeto/Reconhecimento**

PROTOCOLOS DE AÇÃO:
- **Conversa Difícil** — protocolo de encerramento. 3 etapas: Percepções → Combinados (Retratação + Reparação) → Limites. 3 erros que travam: (1) chegar como prestação de contas, (2) exigir concordância, (3) criar expectativas. "Vá com zero."
- **Modo Fome** — gestão ATIVA do desejo. 2 movimentos: Afastar o que tira fome + Aproximar o que alimenta.
- **Plano Perfeito** — estrutura canônica: **Sonho Grande → Objetivos → PDAs**. NÃO é "obsessão por condições ideais" — isso é Reclamar/Justificar disfarçado.
- **Efeito Paralelo** — ferramenta INTENCIONAL: Impacto (padrão a quebrar) + Atividade + Frequência + Prazo. NÃO confundir com **Defeito Paralelo** (involuntário — subir um vetor sem Permissão faz outro cair).

POSICIONAMENTO:
- **Ponto Cego** — frame que vende o mentor como observador externo. "Ignorar quanto custa pra mudar é deixar um ponto cego vivo."

FATO DO PRODUTO (VERDADE INDUSTRIAL — NÃO PODE SER DISTORCIDA):
- Aliança Divergente é um PROGRAMA ONLINE PAGO. Não há agendamento, não há "primeira sessão a marcar", não há "call de integração".
- Formas de pagamento: CARTÃO (à vista ou parcelado) OU BOLETO. Não há PIX necessariamente como opção padrão — ser preciso sobre cartão/boleto.
- Após o pagamento confirmado, o aluno ACESSA IMEDIATAMENTE a plataforma Marca Passos, onde ficam TODOS os materiais (áudios do basal, protocolos, aulas ao vivo, comunidade, trilhas).
- Não existe "espera", "onboarding agendado", "call de boas-vindas pra marcar". Acesso é NA HORA.
- Fechamento correto aponta: método de pagamento (cartão/boleto) + acesso imediato à Marca Passos.

REGRAS CRÍTICAS ADICIONAIS sobre o produto:
15. Ramon mencionar "agendar uma call/sessão/reunião de onboarding/integração/setup" como parte do fechamento → penalize Fidelidade (-2) e Fechamento (-2). Isso NÃO EXISTE no produto.
16. Ramon prometer "marcar um horário", "call de integração", "reunião inicial", "sessão 1x1 agendada" → idem, penalize e corrija na reformulação.
17. Quando o Ramon estiver fechando, a fala ideal aponta: "cartão à vista ou parcelado? Ou prefere boleto?" + "o acesso à Marca Passos é na hora, assim que o pagamento cai". BONIFIQUE quando ele fizer isso.

REGRA DE FECHAMENTO PREMATURO — ARMADILHA "fechou_sem_apresentar":
18. Se o Ramon aplicou Close (Assumptive/Alternative/Risco Reverso/pergunta direta "bora fechar?") SEM que a conversa até aqui tenha incluído:
   (a) 3 Dez OU apresentação estruturada do programa (Marca Passos nomeada + estrutura + o que tem dentro),
   E (b) Ancoragem de preço (valor concreto declarado),
   E (c) Isolamento de preço feito ou proposto,
   → Isso é FECHAMENTO PREMATURO. Penalize Fechamento ≤ 6 e Apresentação ≤ 5, e marque armadilha_cometida = "fechou_sem_apresentar".
19. A reformulação nesse caso NÃO pode ser outro close. Tem que ser a peça que FALTOU: se falta apresentação, apresente o programa em 2 frases ("o que você tá levando é: acesso imediato à Marca Passos, onde ficam áudios do basal, protocolos, lives, trilhas e comunidade — tudo online, do seu ritmo"); se falta ancoragem, ancore ("o investimento é X, à vista ou em até Y vezes"); se falta isolamento, isole ("antes de eu falar de valor, me diz: tirando o investimento, você topa o caminho?").
20. Exceção: se o lead já PERGUNTOU preço ou mandou um aceite vago ("bora fazer isso"), o Ramon AINDA ASSIM deve apresentar/ancorar antes de mandar o link. Fechar sem apresentar gera arrependimento pós-venda — mesma armadilha. Bonifique se o Ramon FREIAR o aceite vago do lead ("espera, antes de mandar o link, deixa eu te explicar exatamente o que você tá levando").

REGRA DE ORDEM DO FECHAMENTO — SEQUÊNCIA OBRIGATÓRIA:
21. A fase de fechamento tem ORDEM INTERNA. Violar a ordem sabota o fechamento mesmo quando cada técnica é boa isolada. A sequência correta:
    PASSO 11: Looping Universal ("a ideia faz sentido pra você?") — confirma que o valor foi percebido
    PASSO 12: Isolamento de Preço ("tirando o investimento, você topa?") — separa objeção financeira da objeção real
    PASSO 13: Ancoragem de Preço (valor total cheio ANTES de parcelar — "R$4.764" antes de "12x de R$397")
    PASSO 14: Looping após ancoragem ("faz sentido o investimento, considerando o que você tá levando?")
    PASSO 15: Skin in the Game / Risco Reverso (quando aplicável)
    PASSO 16: Assumptive Close / Alternative Close ("qual cartão você prefere?" / "cartão ou boleto?")
    PASSO 17: Avanço Concreto (link, próximo passo)
    PASSO 18: Sinal de Aceite Explícito do lead
22. VIOLAÇÕES DE ORDEM (penalize Fechamento -2 + armadilha específica):
    - Ancorou preço ANTES de isolar → armadilha "ancorou_sem_isolar". Reformulação: fazer isolamento agora retroativo ("antes de seguir com o valor, deixa eu te perguntar: tirando o investimento, o caminho faz sentido?").
    - Ancorou só a parcela (R$397×12) sem declarar o total (R$4.764) primeiro → armadilha "ancoragem_parcelada_sem_total". Reformulação: declarar o total primeiro, depois quebrar em parcelas.
    - Aplicou caso real forte (alavanca emocional) e NÃO fez Assumptive Close logo depois → armadilha "perdeu_momento_close". O caso real é gatilho de close; deixar o momento passar exige recomeçar a construção emocional.
    - Ofereceu Risco Reverso antes de Ancoragem + Isolamento → armadilha "risco_reverso_prematuro".
    - Pulou Looping após Apresentação → armadilha "pulou_looping_apresentacao". Toda apresentação de valor exige Looping pra capturar que foi percebido.
23. EXCEÇÃO — se o LEAD perguntou preço diretamente ("quanto é?"), o Ramon tem 2 rotas legítimas:
    (a) Rota longa (preferida): "deixa eu te perguntar algo antes — tirando o investimento, o caminho faz sentido pra você?" (= Isolamento) → depois ancora com total → parcela.
    (b) Rota curta (quando lead tá impaciente): ancora com total primeiro ("o investimento total é R$4.764, que dá pra dividir em até 12x de R$397") → imediatamente faz Looping ("isso faz sentido considerando o que a gente conversou?").
    Em NENHUM caso: jogar só a parcela na cara ("são 12x de R$397") sem total nem contexto. Isso é ancoragem fraca — penalize.

REGRA DE PEDIDO DE APRESENTAÇÃO DO LEAD — ARMADILHA "lead_pediu_apresentacao_ignorou":
24. Se na fala IMEDIATAMENTE ANTERIOR o lead disse uma das frases abaixo (pedido explícito de apresentação do produto), o Ramon tem OBRIGAÇÃO de apresentar no turno seguinte. Frases-gatilho:
    - "que sistema é esse?" / "qual o programa?" / "como funciona?" / "o que é isso que você tá oferecendo?"
    - "me explica / me fala / me mostra / me detalha / me traz detalhes"
    - "preciso saber / quero saber o que é"
    - "quanto custa?" / "qual o preço?" / "qual o valor?" / "qual o investimento?"
    - "não vou entrar em furada sem saber" / "não vou fechar antes de ver" / "não entro a cegas / no escuro"
25. Se o Ramon, diante desse pedido, respondeu com PERGUNTA DE INVESTIGAÇÃO / MIRROR / LABEL / CADEIRA DE BALANÇO / TESTE HIPOTÉTICO em vez de Apresentação+Ancoragem+Isolamento, marque armadilha_cometida = "lead_pediu_apresentacao_ignorou". Cap Apresentação ≤ 5 e Fechamento ≤ 5.
26. Reformulação correta: Marca Passos nomeada + estrutura (o que tem dentro, duração, online, imediato) + investimento total + Isolamento em UMA resposta coesa de 3-5 frases. Exemplo: "Deixa eu te mostrar direito. É o programa da Aliança Divergente dentro da Marca Passos — 8 meses online, com módulos semanais sobre Permissão, Dependência Emocional, Plano Perfeito e lives ao vivo com a gente. Acesso é imediato, pós-pagamento. O investimento total é R$X, que dá pra parcelar em até Y vezes de R$Z. Antes de eu te falar de método de pagamento, deixa eu te perguntar uma coisa — tirando o investimento, faz sentido pra você?"
27. NÃO fugir do preço. Se o lead perguntou diretamente, responder com número. "Depende" ou "Falo depois" sem número é fuga — penalize Fechamento.

REGRA DE PISTA INDIRETA DE PREÇO — ARMADILHA "pista_preco_ignorada":
30. Quando o LEAD sinalizou peso financeiro de forma INDIRETA — sem perguntar valor, só deu pista emocional ("tá pesado", "é muito", "não é pouco", "caro pra mim", "tô apertado", "fora do bolso", "valor puxado", "pesa no bolso", "orçamento curto") — o Ramon TEM que fazer ISOLAMENTO antes de qualquer ancoragem. Isolamento = "antes do valor, o caminho em si faz sentido pra você?" ou "tirando o investimento, você se vê dentro desse processo?".
31. Se o Ramon, diante de pista indireta, respondeu direto com PARCELAMENTO / DESCONTO / CONDIÇÃO ESPECIAL / URGÊNCIA sem Isolamento prévio, marque armadilha_cometida = "pista_preco_ignorada". Cap Fechamento ≤ 5.5. Motivo: comprou a objeção financeira como se fosse o problema, sem testar se era só superfície. Reformulação: devolver ao Isolamento, depois ancorar total + parcela, só depois abrir método de pagamento.

REGRA DE PRE-HANDLING POR PERFIL PROFISSIONAL — ARMADILHA "perdeu_prehandling_perfil":
32. Quando o lead tem PROFISSÃO CONSERVADORA de objeções previsíveis — servidor público, magistrado (juiz/promotor/desembargador), militar/policial, médico/dentista, professor/acadêmico, advogado — o Ramon TEM que antecipar via Pre-handling de 3 Objeções nos turnos 8-11, ANTES do lead levantar. Objeções típicas: estabilidade vs risco (servidor), imagem pública (magistrado), escala rígida (militar), rotina exausta (médico), identidade intelectual (professor), horas faturáveis (advogado).
33. Se o Ramon chegou na Ancoragem / Close SEM ter antecipado 1-2 objeções típicas do perfil, e o lead jogou essa objeção depois, marque armadilha_cometida = "perdeu_prehandling_perfil". Cap Apresentação ≤ 6.5. Motivo: ficou reativo no close em vez de ter desarmado antes. Reformulação: embutir Pre-handling no turno 9-10 — "antes da gente seguir, deixa eu antecipar o que passa pela cabeça de quem é [profissão]: primeiro X; segundo Y. Você tá sentindo algo parecido?".

REGRA DE NOMEAÇÃO DE PADRÃO QUANDO O LEAD JÁ NOMEOU — ARMADILHA "nomeou_padrao_cedo" (caso especial estudioso):
28. Quando o LEAD já nomeou o padrão no turno 1 ("sou o Salvador", "vivo na Matriz da Utilidade", "é Obesidade Intelectual") E o Ramon nos turnos 2-3 RE-CONFIRMOU E APROFUNDOU o diagnóstico técnico (Label de "esse padrão tem nome, é Salvador…" / Accusation Audit em cima do padrão), ainda é armadilha "nomeou_padrao_cedo" — o lead joga o nome pra ver se o Ramon vai de cabeça, mas o caminho correto é RECONHECER o vocabulário ("pelo jeito você já rodou pelo conteúdo") SEM confirmar o diagnóstico, e devolver pra DOR EMOCIONAL CONCRETA ("esquece o nome por um segundo — me conta onde isso te machucou esta semana").
29. Se o coach caiu nessa armadilha e cap Abertura ≤ 5, marque também "pulou_dor_emocional" como sinal secundário. A reformulação é: trocar o Label diagnóstico por uma pergunta de Implicação sobre a cena concreta da dor.

REGRAS CRÍTICAS ABSOLUTAS (derrubam Fidelidade ≤ 2):
1. Clichê motivacional ("você é capaz", "acredite", "descubra seu potencial")
2. Religiosidade indevida ("tempo de Deus" fora de contexto)
3. Lei da atração / mentalidade abundância
4. **RESSIGNIFICAÇÃO** ("vamos contar uma nova história sobre seu passado") — Elton é explícito contra. "Não vamos viver de novas histórias, vamos viver de clareza."
5. Oferecer desconto como quebra
6. Urgência artificial (escassez falsa)
7. **Atacar família/pessoa do lead** — rotular alguém da família como Vítima/Vingador/Narcisista na cara do lead. Nomear SEMPRE o PADRÃO, nunca a pessoa.
8. Promessa de 10k/mês / enriquecimento rápido / luxo
9. Lista de bônus empilhada como gancho principal (virou guru, não mentor)
10. "Alguma dúvida?" no fim como fechamento (desesperado)
11. Aceitar 'vou pensar' sem Avanço → Fechamento ≤ 3
12. Responder objeção DIRETAMENTE sem Looping → Fechamento ≤ 4
13. Repetir preço 2+ vezes (insegurança) → Fechamento ≤ 3
14. Usar apelido comercial (Mula de Carga, Festa no Banheiro, etc.) sem conhecer o nome canônico — se o lead entrar na Aliança e não encontrar o termo, gera dissonância. Evite afirmar "tem um nome pra isso: X" quando X é apelido sem âncora no canônico.
15. **LEI DO CHECKOUT NA CALL** — descoberta de 26/05/2026, confirmada pelo CRM em 5 calls (Giovana/Janson/Shirley/Gabriela/Thiago — 0/5 viraram pagamento). Se o lead deu "sim" verbal e Ramon transferiu o pagamento pra DEPOIS da call (WhatsApp / mais tarde / à noite / amanhã / em casa / "te mando o link depois") SEM comprovante recebido NA CALL → Fechamento ≤ 3, nota_geral ≤ 5, armadilha "fechamento_aparente_transferido". Regra operacional: o checkout COMPLETO (link enviado + comprovante recebido) DEVE acontecer dentro da própria call. Único caso aceitável de transferência: evento concreto de transição (Intensivão hoje 19h / mãe sai do hospital sábado / saque na lotérica segunda) com data+critério+motivo de retomada ancorados.
16. **SINO PREMATURO** — tocar o sino, dizer "parabéns pela decisão" ou "bem-vindo à aliança" ANTES do comprovante recebido na call é celebração que SUBSTITUI a ação. Cialdini reverso: o "sim" simbólico esvazia a necessidade do "sim" real. Sino só APÓS comprovante. Se Ramon tocar antes → nota_geral ≤ 6, armadilha "sino_prematuro".

RUBRICA (0-10 por dimensão):
- Escuta Ativa (peso 0.2) — Mirror, Label, uso das palavras do lead
- Investigação (peso 0.2) — Perguntas de Problema, Implicação, Necessidade de Solução
- Apresentação (peso 0.2) — 3 Dez na ordem, Storytelling, Pre-handling
- Fechamento (peso 0.25) — Looping, 3 Tons, Isolamento, Close, Avanço
- Fidelidade à Metodologia (peso 0.15) — conceitos por nome, voz de mesa de jantar, sem proibições

NUNCA:
- Elogie genérico. Cite palavra/frase EXATA do Ramon
- Recomende desconto, clichê ou religiosidade

SAÍDA: JSON estrito, sem markdown nem fences.
{
  "nota_geral": 7.2,
  "notas": { "escuta": 8, "investigacao": 7, "apresentacao": 6, "fechamento": 7, "fidelidade": 8 },
  "ponto_forte": "palavra/frase EXATA que o Ramon usou bem",
  "ajuste": "UM ajuste mais impactante",
  "reformulacao": "frase concreta na voz do Ramon pra substituir o que ele disse",
  "porque": "ancorado em conceito Teoria da Permissão POR NOME + técnica do Caminho POR NOME",
  "conceito_usado_pelo_ramon": "nome OU null",
  "conceito_que_deveria_usar": "nome do conceito",
  "passo_do_caminho_executado": N (1-18 OU null se não executou passo claro),
  "passo_do_caminho_ideal_agora": N (qual passo DEVERIA estar sendo executado),
  "passos_cumpridos_na_sessao_ate_aqui": [1, 2, 5],
  "tecnica_que_deveria_usar": "nome da técnica com autor",
  "tecnicas_aplicadas": {
    "mirror": false, "label": false, "perguntas_calibradas": false, "silencio_dinamico": false,
    "4_segundos": false, "tom_eu_me_importo": false, "pergunta_implicacao": false,
    "pergunta_necessidade": false, "patamar_ledge": false, "thats_right": false,
    "accusation_audit": false, "storytelling_cena": false, "pre_handling_3_objecoes": false,
    "3_dez": false, "framework_3a": false, "metodo_4_passos_concer": false, "cisnes_negros": false,
    "10_tonalidades": false, "looping_universal": false, "isolamento_preco": false,
    "cadeira_balanco": false, "skin_in_the_game": false, "assumptive_close": false,
    "alternative_close": false, "avanco_concreto": false, "teste_hipotetico": false,
    "best_worst_case": false, "risco_reverso": false, "ancoragem_preco": false, "takeaway": false,
    "micro_commitments": false, "nomeou_conceito_permissao": false, "frase_ancora_ancorada": false,
    "caso_real_citado": false
  },
  "tonalidades_detectadas": ["Eu me importo", "Certeza Absoluta"],
  "armadilha_cometida": null OU nome,
  "xp_bonus_tecnicas": 0,
  "lead_ceder_camada": false,
  "lead_endurecer": false,
  "pode_fechar": false
}

Regra especial: marque "tecnicas_aplicadas" com TRUE SÓ se tiver evidência clara no texto do Ramon. Não invente.`
    }];
  }

  function buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn, passosCumpridosAnteriormente, lastLeadHint }) {
    // Checagem determinística de pré-requisitos de close (igual ao leadHint) — alimenta regra 18
    const ramonTextoCompleto = (conversation || [])
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .concat([lastRamon || ''])
      .join(' \n ');
    const mencionouMarcaPassos = /\bmarca[-\s]?passos\b/i.test(ramonTextoCompleto);
    const ancoragemPreco = /\b(R\$|reais|m[eê]s|parcela|anu(al|idade)|investimento\s+[eé]|valor\s+[eé]|custa|custo|paga\s+\d+|\d[\d\.\,]*\s*(reais|pila|conto))\b/i.test(ramonTextoCompleto);
    const fezIsolamento = /\b(tirando\s+o?\s+(investimento|valor|pre[çc]o)|fora\s+o?\s+(pre[çc]o|investimento)|independente\s+do?\s+(pre[çc]o|valor))\b/i.test(ramonTextoCompleto);
    const tresDez = /\b(3\s*dez|tr[eê]s\s*dez|produto.{0,40}voc[eê].{0,60}alian[çc]a)\b/i.test(ramonTextoCompleto);
    const submodoJaFechamento = ['fechamento', 'quebra'].includes(scenario.submodo);

    const preReqBloco = `
CHECAGEM SISTÊMICA DE PRÉ-REQUISITOS DE CLOSE (use pra aplicar regra 18 — fechou_sem_apresentar):
- Marca Passos nomeada em alguma fala do Ramon? ${mencionouMarcaPassos ? 'SIM' : 'NÃO'}
- 3 Dez aplicado em alguma fala? ${tresDez ? 'SIM (indício)' : 'NÃO'}
- Ancoragem de preço feita? ${ancoragemPreco ? 'SIM' : 'NÃO'}
- Isolamento de preço feito/proposto? ${fezIsolamento ? 'SIM' : 'NÃO'}
- Sub-modo começa em fechamento por design? ${submodoJaFechamento ? 'SIM (exceção da regra 18)' : 'NÃO'}
Se o Ramon aplicou Close NESTA resposta mas a tabela acima tem NÃO em apresentação+ancoragem, MARQUE armadilha_cometida = "fechou_sem_apresentar" e penalize conforme regra 18 — a não ser que o sub-modo seja fechamento/quebra.
`;

    const hintBlock = lastLeadHint ? `
LEAD_HINT_ANTERIOR (dica que foi mostrada ao Ramon ANTES dele responder — use como gabarito):
${JSON.stringify({
  possivel_objecao: lastLeadHint.possivel_objecao,
  passo_do_caminho_sugerido: lastLeadHint.passo_do_caminho_sugerido,
  conceito_permissao_em_jogo: lastLeadHint.conceito_permissao_em_jogo,
  tecnicas_sugeridas: (lastLeadHint.tecnicas_sugeridas || []).map(t => ({ nome: t.nome, exemplo: t.exemplo })),
  resposta_nota_10: lastLeadHint.resposta_nota_10
}, null, 2)}

REGRA: se a resposta do Ramon abaixo for semanticamente equivalente à \`resposta_nota_10\` acima (mesmas técnicas, mesmo passo, mesma intenção), nota_geral = 10.0 OBRIGATÓRIO, todas as 5 dimensões = 10, e o campo "ajuste" deve ser null/vazio (ou literal "sem ajustes — resposta nota 10"). Se você NÃO consegue apontar um ajuste concreto e acionável, NÃO dê 9.5 — dê 10.
` : '';

    return `CONTEXTO DA SESSÃO (turno ${turn}) — Arena 2, sub-modo ${scenario.submodo}.

Persona:
- Nome: ${scenario.persona.nome} (${scenario.persona.idade}, ${scenario.persona.profissao})
- Padrão oculto Teoria da Permissão: ${scenario.padrao_oculto_teoria_permissao}
- Objeção superficial: ${scenario.objecao_superficial}
- Objeção real (oculta pro Ramon, visível pra você): ${scenario.objecao_real}
- Técnicas ideais neste cenário: ${(scenario.tecnicas_ideais_aqui || []).join(', ')}
- Nível de conhecimento da metodologia: ${scenario.nivel_conhecimento_metodologia || 'exposto'}
- Vocabulário que o lead já usa: ${JSON.stringify(scenario.vocabulario_que_usa || [])}
- Dúvida típica de aplicação: ${scenario.duvida_aplicacao_tipica || '(não definida)'}

Passos do Caminho JÁ cumpridos anteriormente na sessão: ${JSON.stringify(passosCumpridosAnteriormente || [])}

Conversa até aqui:
${conversation.map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}
${preReqBloco}${hintBlock}
RESPOSTA DO RAMON A SER AVALIADA AGORA (turno ${turn}):
"${lastRamon}"

Avalie com rigor E com coerência contra a dica (se fornecida). Identifique qual passo do Caminho o Ramon executou neste turno. Marque técnicas com honestidade.`;
  }

  async function evaluateTurn({ scenario, conversation, lastRamon, turn, data, passosCumpridosAnteriormente, lastLeadHint }) {
    const system = buildEvaluatorSystem({ data });
    const user = buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn, passosCumpridosAnteriormente, lastLeadHint });
    const { text } = await ClaudeAPI.call({
      system, messages: [{ role: 'user', content: user }],
      max_tokens: 1100, temperature: 0.1
    });
    const parsed = ClaudeAPI.extractJSON(text);
    if (!parsed) throw new Error('Avaliação inválida');

    // Recalcular xp_bonus_tecnicas se não veio
    if (!parsed.xp_bonus_tecnicas) {
      let sum = 0;
      Gamification.TECHNIQUES.forEach(t => {
        if (parsed.tecnicas_aplicadas && parsed.tecnicas_aplicadas[t.id]) sum += t.xp;
      });
      parsed.xp_bonus_tecnicas = sum;
    }

    // PROTEÇÃO DETERMINÍSTICA: se o LLM não conseguiu nomear um ajuste concreto,
    // a resposta é nota 10. Corrige o viés conservador de "9.5 porque sim".
    // EXCEÇÃO: se o LLM marcou armadilha (fechou_sem_apresentar, proibida absoluta, etc.)
    // a nota NÃO pode ser forçada a 10 — a armadilha já é o ajuste de facto.
    const temArmadilha = !!parsed.armadilha_cometida &&
      String(parsed.armadilha_cometida).trim().toLowerCase() !== 'null' &&
      String(parsed.armadilha_cometida).trim() !== '';
    const ajuste = (parsed.ajuste || '').trim().toLowerCase();
    const ajusteVazio = !ajuste ||
      /^(sem|nenhum|n\/a|nda|—|-|null|nada|perfeito|nota ?10|10\/10)/.test(ajuste) ||
      /resposta\s*nota\s*10/.test(ajuste) ||
      /sem\s*ajuste/.test(ajuste);

    // PROTEÇÃO DETERMINÍSTICA DE RITMO — aplica ANTES da proteção de nota 10.
    // Se o Ramon aplicou técnica de fase avançada em turno muito baixo, CAPA a nota
    // e marca armadilha fechou_sem_apresentar (rede de segurança caso o LLM deixe passar).
    // Só se aplica ao sub-modo caminho_completo.
    const submodoCompleto = scenario.submodo === 'caminho_completo' || !scenario.submodo;
    const submodoJaFechamento = ['fechamento', 'quebra'].includes(scenario.submodo);
    if (submodoCompleto) {
      const tecs = parsed.tecnicas_aplicadas || {};
      const tentouClose = tecs.assumptive_close || tecs.alternative_close || tecs.risco_reverso;
      const ancorouPreco = tecs.ancoragem_preco;
      const apresentou3Dez = tecs['3_dez'];
      const nomeouConceito = tecs.nomeou_conceito_permissao;

      let capNota = null;
      let armadilhaForcada = null;
      let ajusteForcado = null;

      // ORDEM DE FECHAMENTO — detecta ancoragem sem isolamento prévio
      // (mesmo que o turno esteja correto, a ORDEM importa)
      const ramonCompletoEval = (conversation || [])
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' \n ');
      const isolamentoJaFeito = /\b(tirando\s+o?\s+(investimento|valor|pre[çc]o)|fora\s+o?\s+(pre[çc]o|investimento)|independente\s+do?\s+(pre[çc]o|valor))\b/i.test(ramonCompletoEval);
      // Ancoragem só da parcela sem total (ex: "12x de R$397" sem "R$4.764 total")
      const textoRamonAgora = lastRamon || '';
      const tocaParcelaSoAgora = /\b\d+\s*x\s*(de\s*)?R?\$?\s*\d/i.test(textoRamonAgora);
      const tocaTotalAgora = /\bR\$\s*\d[\d\.\,]{2,}(?!\s*,?\s*\d*\s*x)/i.test(textoRamonAgora) ||
                            /\btotal\s+[eé]\s+R\$/i.test(textoRamonAgora) ||
                            /\binvestimento\s+total/i.test(textoRamonAgora);
      const tocaTotalAntes = /\bR\$\s*\d[\d\.\,]{2,}/i.test(ramonCompletoEval) && !ancorouPreco;

      // ========= ARMADILHA lead_pediu_apresentacao_ignorou =========
      // Se a fala anterior do LEAD foi um pedido explícito de apresentação
      // ("que sistema?", "como funciona?", "quanto custa?", "me explica",
      // "não vou entrar sem saber...") E o Ramon neste turno NÃO apresentou
      // (sem Marca Passos + sem ancoragem) + NÃO avançou a investigação pra
      // justificar a espera, cap a nota em 4.5 e marca armadilha explícita.
      const ultimaMensagemLeadAntesRamon = [...(conversation || [])].reverse()
        .find(m => m.role === 'assistant')?.content || '';
      const leadPediuApresentacaoAnterior =
        /\b(que\s+sistema\s+é\s+esse|qual\s+[eé]\s+(o\s+)?sistema|que\s+programa|como\s+funciona|como\s+[eé]\s+(o\s+)?(programa|esse|isso)|o\s+que\s+[eé]\s+(isso|esse|a\s+alian[çc]a|o\s+programa|a\s+marca)|me\s+expl(ica|ique|ic)|me\s+fala|me\s+mostra|me\s+detalha|preciso\s+(saber|entender|ver)|quero\s+(saber|entender|ver)|o\s+que\s+(voc[eê]|cê)\s+(t[aá]|est[aá])\s+(ofere|me\s+ofere)|quanto\s+custa|quanto\s+[eé]|qual\s+(o\s+)?(pre[çc]o|valor|investimento)|me\s+d[aá]\s+(mais\s+)?detalh|me\s+traz\s+detalh)\b/i.test(ultimaMensagemLeadAntesRamon) ||
        /\b(n[ãa]o\s+(vou\s+)?(entrar|fechar|comprar|assinar|fazer))\b[^.!?]{0,60}\b(sem\s+saber|sem\s+entender|antes\s+de\s+(saber|entender|ver|conhecer)|no\s+escuro|a\s+cegas)/i.test(ultimaMensagemLeadAntesRamon);

      const ramonAgoraApresentou = /\bmarca[-\s]?passos\b/i.test(textoRamonAgora) ||
                                   /\b(R\$|reais|\d+\s*x|parcel|investimento\s+(é|de|total))\b/i.test(textoRamonAgora);

      // ========= ARMADILHA pista_preco_ignorada =========
      // Lead deu PISTA INDIRETA de peso financeiro ("tá pesado", "é muito",
      // "não é pouco", "tô apertado", "fora do bolso", "valor puxado") e o
      // Ramon NÃO fez Isolamento neste turno nem reconheceu o peso —
      // foi direto pra parcela/desconto/urgência. Isso é o erro clássico
      // de responder à pista como se fosse objeção de preço resolvível
      // com número menor. Cap em 5.5.
      const leadPistaIndiretaAntes = /\b(t[aá]\s+(pesad[oa]|salgad[oa]|apertad[oa]|car[oa])|pesad[oa]\s+(pra\s+mim|demais|pro\s+bolso)|t[aá]\s+car[oa]|[eé]\s+muito\s+dinheiro|n[ãa]o\s+[eé]\s+pouco|sai\s+car[oa]|pesa\s+(no|pro)\s+bolso|fora\s+do?\s+(meu\s+)?(bolso|or[çc]amento)|or[çc]amento\s+(curto|apertado|aper)|t[oô]\s+apertad[oa]|apertad[oa]\s+(no|com\s+o)\s+(dinheiro|or[çc]amento|grana)|n[ãa]o\s+(sei|tenho\s+certeza)\s+se\s+(consigo|cabe|d[aá])|preciso\s+ver\s+se\s+(cabe|d[aá]|consigo)|investimento\s+(alto|grande|pesado)|valor\s+(alto|pesado|salgado|puxado|bravo)|esse\s+valor|esse\s+investimento|t[aá]\s+puxado|t[aá]\s+salgado|grana\s+(curta|apertada)|vai\s+pesar|dinheiro\s+curto|ta\s+caro|t[aá]\s+bravo)\b/i.test(ultimaMensagemLeadAntesRamon);
      const ramonFezIsolamentoAgora = /\b(tirando\s+o?\s+(investimento|valor|pre[çc]o)|fora\s+o?\s+(pre[çc]o|investimento)|independente\s+do?\s+(pre[çc]o|valor)|antes\s+do\s+(valor|pre[çc]o|investimento))\b/i.test(textoRamonAgora);
      const ramonFoiProParcelaOuDesconto = /\b(\d+\s*x\s*(de\s*)?R?\$?\s*\d|parcel|desconto|condi[çc][ãa]o\s+especial|promo|abatimento|prazo\s+estendido)\b/i.test(textoRamonAgora);

      if (tentouClose && turn < 10) {
        capNota = 4;
        armadilhaForcada = parsed.armadilha_cometida || 'fechou_sem_apresentar';
        ajusteForcado = `tentativa de fechamento no turno ${turn} — prematuro. Close só depois do turno 10 (após investigação + apresentação + ancoragem + isolamento).`;
      } else if (leadPediuApresentacaoAnterior && !ramonAgoraApresentou) {
        // Lead pediu o produto, Ramon continuou cavando — perdeu a janela.
        capNota = 4.5;
        armadilhaForcada = parsed.armadilha_cometida || 'lead_pediu_apresentacao_ignorou';
        ajusteForcado = `lead pediu apresentação explícita ("o que é?", "como funciona?", "quanto custa?") e Ramon continuou investigando em vez de apresentar. Resposta correta: Marca Passos + estrutura (2-3 frases) + preço total + Isolamento — nessa ordem.`;
      } else if (leadPistaIndiretaAntes && !ramonFezIsolamentoAgora && ramonFoiProParcelaOuDesconto) {
        // Lead sinalizou peso financeiro de forma indireta e Ramon
        // respondeu com parcelamento/desconto SEM fazer Isolamento antes —
        // comprou a objeção financeira sem testar se era a objeção real.
        capNota = 5.5;
        armadilhaForcada = parsed.armadilha_cometida || 'pista_preco_ignorada';
        ajusteForcado = `lead sinalizou peso financeiro de forma indireta ("tá pesado", "é muito", "tô apertado", etc) e Ramon foi direto pra parcelamento/desconto. Ordem correta: Isolamento ANTES — "tirando o investimento, o caminho faz sentido pra você?" — pra separar objeção financeira da objeção real. Só DEPOIS do sim, ancora total + parcela.`;
      } else if (ancorouPreco && !isolamentoJaFeito && !submodoJaFechamento) {
        // Ancorou preço sem isolar primeiro — ORDEM ERRADA
        capNota = 7;
        armadilhaForcada = parsed.armadilha_cometida || 'ancorou_sem_isolar';
        ajusteForcado = `ancoragem de preço sem Isolamento prévio. Antes de revelar valor: "tirando o investimento, o caminho faz sentido pra você?" — separa objeção financeira da objeção real.`;
      } else if (ancorouPreco && tocaParcelaSoAgora && !tocaTotalAgora && !tocaTotalAntes) {
        // Ancorou só a parcela sem declarar o total primeiro
        capNota = 7;
        armadilhaForcada = parsed.armadilha_cometida || 'ancoragem_parcelada_sem_total';
        ajusteForcado = `ancorou parcela sem declarar o total primeiro. Ancoragem correta: total cheio ANTES de parcelar — "o investimento total é R$X, que dá pra dividir em até Y vezes".`;
      } else if (ancorouPreco && turn < 10) {
        capNota = 5;
        armadilhaForcada = parsed.armadilha_cometida || 'ancorou_preco_cedo';
        ajusteForcado = `ancoragem de preço no turno ${turn} — prematuro. Preço entra depois que valor foi estabelecido (turno 10+).`;
      } else if (apresentou3Dez && turn < 8) {
        capNota = 5;
        armadilhaForcada = parsed.armadilha_cometida || 'apresentou_cedo';
        ajusteForcado = `apresentou 3 Dez / Marca Passos no turno ${turn} — ainda é fase de investigação. Apresentação vem a partir do turno 8 ou 9.`;
      } else if (nomeouConceito && turn < 3) {
        capNota = 6;
        armadilhaForcada = parsed.armadilha_cometida || 'nomeou_padrao_cedo';
        ajusteForcado = `nomeou o padrão no turno ${turn} — antes de conexão/rapport. Deixe o lead falar mais, cavar com Mirror/Label, nomear o padrão depois do 3º turno.`;
      }

      if (capNota !== null) {
        if ((parsed.nota_geral || 0) > capNota) parsed.nota_geral = capNota;
        if (parsed.notas) {
          if ((parsed.notas.fechamento || 0) > capNota) parsed.notas.fechamento = capNota;
          if ((parsed.notas.apresentacao || 0) > capNota) parsed.notas.apresentacao = capNota;
          if (tentouClose || ancorouPreco) {
            // Bate também em fidelidade pq pulou o Caminho
            if ((parsed.notas.fidelidade || 0) > capNota + 1) parsed.notas.fidelidade = capNota + 1;
          }
        }
        if (!parsed.armadilha_cometida) parsed.armadilha_cometida = armadilhaForcada;
        if (ajusteVazio) parsed.ajuste = ajusteForcado;
        // Marca a proteção de ritmo pra debug
        parsed._ritmo_cap_aplicado = armadilhaForcada;
      }
    }

    // ============ LEI DO CHECKOUT NA CALL ============
    // Detecta o padrão das 5 calls perdidas confirmadas pelo CRM (26/05/2026):
    // Giovana/Janson/Shirley/Gabriela/Thiago — lead deu aceite verbal + Ramon
    // transferiu pagamento pra fora da call (WhatsApp/depois/casa/amanhã) +
    // nenhum comprovante recebido na call. 0/5 viraram pagamento.
    // Vale pra TODOS os sub-modos (independente do bloco de cap de ritmo).
    {
      const REGEX_ACEITE_VERBAL_LEAD = [
        /\b(pode\s+ser|t[áa]\s+bom|tô\s+dentro|estou\s+dentro|topo|aceito|vamos|fechado|fechou|fecha\s+a[íi]|quero\s+(sim|entrar|fechar|comprar|pagar)|bora|partiu)\b/i,
        /\b(parab[ée]ns\s+pela\s+decis[ãa]o|bem-?vind[oa]\s+(à|a)\s+(alian[çc]a|aliança))\b/i
      ];
      const REGEX_TRANSFERENCIA_RAMON = [
        /\b(whats(app)?|wpp|zap)\b/i,
        /\b(depois|mais\s+tarde|[àa]\s+noite|ainda\s+hoje|amanh[ãa]|outro\s+dia|na\s+sua\s+casa)\b/i,
        /\b(quando\s+(voc[eê]|cê|tu)\s+(chegar|puder|tiver\s+tempo|conseguir))\b/i,
        /\b(te\s+mand(o|ei|arei)|eu\s+te\s+mando|mando\s+(o\s+)?link\s+(depois|pelo\s+wpp|pelo\s+whats|via\s+whats)|envio\s+(o\s+link\s+)?depois)\b/i,
        /\b(s[oó]\s+(me\s+)?(avisa|me\s+manda)\s+(quando|a[ií]))\b/i,
        /\b(faz\s+com\s+calma|com\s+calma\s+a[íi])\b/i
      ];
      const REGEX_COMPROVANTE_NA_CALL = [
        /\b(comprovante|pix\s+(copiad[oa]|copia\s+e\s+cola)|paguei|pagamento\s+(aprovado|confirmado|recebido|efetuado)|cart[aã]o\s+(aprovado|passou)|deu\s+certo\s+(o\s+pix|aqui|o\s+pagamento)|chegou\s+(o\s+)?(e-?mail|email)\s+(do\s+(boleto|acesso))?|j[aá]\s+t[aá]\s+pago|apareceu\s+a\s+confirma|chegou\s+a\s+confirma|entrei\s+(na\s+)?(plataforma|marca\s+passos)|recebi\s+o\s+acesso)\b/i
      ];

      // Janela: últimos 5 turnos da conversa (lead ainda aceitando recentemente)
      const last5Conv = (conversation || []).slice(-5);
      const leadDeuAceiteVerbal = last5Conv.some(m =>
        m.role === 'assistant' && REGEX_ACEITE_VERBAL_LEAD.some(rx => rx.test(m.content || ''))
      );
      // Transferência: olha últimas falas do Ramon + a resposta atual
      const ramonRecente = last5Conv.filter(m => m.role === 'user')
        .map(m => m.content)
        .concat([lastRamon || ''])
        .join(' \n ');
      const ramonTransferiuPraDepois = REGEX_TRANSFERENCIA_RAMON.some(rx => rx.test(ramonRecente));
      // Comprovante pode aparecer em QUALQUER turno (lead ou Ramon citando recebimento)
      const todasFalas = (conversation || []).map(m => m.content || '').concat([lastRamon || '']).join(' \n ');
      const houveComprovante = REGEX_COMPROVANTE_NA_CALL.some(rx => rx.test(todasFalas));

      // ============ SINO PREMATURO ============
      // Ramon tocou sino / disse "parabéns pela decisão" / "bem-vindo à aliança"
      // ANTES de qualquer comprovante na conversa. Erro clássico das 5 calls perdidas.
      const REGEX_SINO_TOCADO = [
        /\b(posso\s+tocar\s+(o\s+)?sino|toca(r)?\s+(o\s+)?sino|tocando\s+(o\s+)?sino|sino\s+da\s+(alian[çc]a|chegada))\b/i,
        /\b(parab[ée]ns\s+pela\s+decis[ãa]o|bem-?vind[oa]\s+(à|a)\s+(alian[çc]a|aliança)|aliad[oa]\s+oficial|seja\s+(muito\s+)?bem-?vind[oa])\b/i
      ];
      const ramonTocouSinoAgora = REGEX_SINO_TOCADO.some(rx => rx.test(lastRamon || ''));
      if (ramonTocouSinoAgora && !houveComprovante) {
        if ((parsed.nota_geral || 0) > 6) parsed.nota_geral = 6;
        if (parsed.notas && (parsed.notas.fechamento || 0) > 5) parsed.notas.fechamento = 5;
        if (!parsed.armadilha_cometida || parsed.armadilha_cometida === 'null') {
          parsed.armadilha_cometida = 'sino_prematuro';
        }
        if (!parsed.ajuste || /^(sem|nenhum|—|-|null|nada)/.test((parsed.ajuste || '').toLowerCase())) {
          parsed.ajuste = `SINO PREMATURO — você celebrou ("parabéns pela decisão" / "bem-vindo" / tocou sino) ANTES do comprovante de pagamento na call. Cialdini reverso: o "sim" simbólico esvazia a necessidade do "sim" real (foi o que matou as 5 calls do CRM). Sino só APÓS o comprovante. Antes do sino: garante o link → confirma pagamento → confirma acesso. AÍ celebra.`;
        }
        parsed._sino_prematuro_aplicado = true;
      }

      if (leadDeuAceiteVerbal && ramonTransferiuPraDepois && !houveComprovante) {
        if ((parsed.nota_geral || 0) > 5) parsed.nota_geral = 5;
        if (parsed.notas) {
          if ((parsed.notas.fechamento || 0) > 3) parsed.notas.fechamento = 3;
          if ((parsed.notas.fidelidade || 0) > 5) parsed.notas.fidelidade = 5;
        }
        parsed.armadilha_cometida = 'fechamento_aparente_transferido';
        parsed.ajuste = `LEI DO CHECKOUT NA CALL violada — lead deu "sim" verbal e Ramon transferiu pagamento pra depois (WhatsApp / casa / amanhã / mais tarde) SEM comprovante recebido na call. 5 calls do CRM provam: 0/5 dessas viraram pagamento. Mantenha o lead na call: "Pega seu celular agora, vou te enviar o link. Confirma quando chegar. Tô aqui na linha enquanto você preenche."`;
        parsed.reformulacao = parsed.reformulacao || 'Beleza! Pega seu celular aí. Tô te mandando o link agora pelo WhatsApp — abre pra mim e me confirma quando chegar. Tô na linha contigo enquanto você preenche, qualquer coisa eu te ajudo.';
        parsed._lei_checkout_aplicada = true;
        // Bloqueia XP de fechamento desta resposta (zera técnicas de fechamento)
        if (parsed.tecnicas_aplicadas) {
          ['assumptive_close','alternative_close','avanco_concreto','risco_reverso','isolamento_preco','ancoragem_preco','3_dez','looping_universal']
            .forEach(t => { parsed.tecnicas_aplicadas[t] = false; });
          // Recalcula xp_bonus_tecnicas pra refletir a zeragem
          let sum = 0;
          Gamification.TECHNIQUES.forEach(t => {
            if (parsed.tecnicas_aplicadas[t.id]) sum += t.xp;
          });
          parsed.xp_bonus_tecnicas = sum;
        }
      }
    }

    // Recalcula se tem armadilha APÓS o cap de ritmo (pode ter criado uma)
    const temArmadilhaFinal = !!parsed.armadilha_cometida &&
      String(parsed.armadilha_cometida).trim().toLowerCase() !== 'null' &&
      String(parsed.armadilha_cometida).trim() !== '';
    const ajusteFinalVazio = !((parsed.ajuste || '').trim()) ||
      /^(sem|nenhum|n\/a|nda|—|-|null|nada|perfeito|nota ?10|10\/10)/.test((parsed.ajuste || '').trim().toLowerCase()) ||
      /resposta\s*nota\s*10/.test((parsed.ajuste || '').trim().toLowerCase()) ||
      /sem\s*ajuste/.test((parsed.ajuste || '').trim().toLowerCase());

    if (ajusteFinalVazio && !temArmadilhaFinal) {
      parsed.nota_geral = 10;
      if (parsed.notas) {
        parsed.notas.escuta = 10; parsed.notas.investigacao = 10; parsed.notas.apresentacao = 10;
        parsed.notas.fechamento = 10; parsed.notas.fidelidade = 10;
      }
      parsed.ajuste = 'sem ajustes — resposta nota 10';
      parsed.reformulacao = parsed.reformulacao || '(já está no ponto)';
    } else if (ajusteFinalVazio && temArmadilhaFinal) {
      parsed.ajuste = `armadilha detectada: ${parsed.armadilha_cometida} — ver reformulação`;
    }

    return parsed;
  }

  // ========= DICA INLINE PÓS-FALA DO LEAD =========
  async function leadHint({ scenario, leadMessage, conversation, turn, data, awaitingPaymentConfirmation, turnosDesdeAceite }) {
    // System é estático (regras + JSON schema). Variáveis turn-dependent vão no USER prompt.
    // Empacotado em block array com cache_control pra Anthropic cachear.
    const systemText = `Você é coach L99 do Dojô Improvável (Arena 2 — chamada pós-evento).

Sua função nesta chamada: ler UMA fala recém-chegada do LEAD e produzir uma dica rápida pro Ramon — o que está em jogo, que caminhos técnicos existem, EXEMPLOS EXATOS de aplicação e uma resposta-modelo nota 10.

Regras:
- Cirúrgico, curto, sem prosa motivacional
- Nomes REAIS das técnicas do compêndio (Mirror, Label, Looping Universal, 3 Dez, Implicação, Necessidade de Solução, Cadeira de Balanço, Isolamento, Pre-handling, Assumptive Close, Avanço, Teste Hipotético, Risco Reverso, Skin in the Game, 10 Tonalidades, Framework 3A, Thats Right, Accusation Audit, etc.)
- PREFIRA NOMES CANÔNICOS no campo \`conceito_permissao_em_jogo\`. Lista canônica:
  Fundamentos: Permissão / CDP / PDA (Descontrolado vs. Memorável)
  Diagnóstico: Padrões (3 dimensões: Acontecimento+Comportamento+Relacionamento / 3 camadas: Mostrar+Desenvolver+Diplomar) / Matriz da Utilidade (4 quadrantes: Punir+Poupar+Unir+Afastar) / Pré-Queda (4 gatilhos + 3 Ps) / Teto Financeiro + CPF / Escada da Maturidade (5 degraus) / Escada da Postura (5 degraus)
  Relacional: Dependência Emocional (5 Danos) / 3 Perfis Controladores (Vítima/Vingador/Narcisista — SEM Salvador, que é manifestação do Narcisista) / Combinados (Inconsciente Velado / Vencido / Desesperado)
  Protocolos: Conversa Difícil (3 etapas: Percepções→Combinados→Limites) / Modo Fome / Plano Perfeito (Sonho Grande→Objetivos→PDAs) / Efeito Paralelo (intencional) / Defeito Paralelo (involuntário) / Ponto Cego
- APELIDOS COMERCIAIS — use APENAS pra rapport inicial com o lead NA FALA (resposta_nota_10 e exemplos), NUNCA como \`conceito_permissao_em_jogo\` sozinho. Se for inevitável citar um apelido por causa do contexto da fala do lead, use o formato "Apelido (canônico: Nome Canônico)" no campo conceito. Mapeamento:
  * "Mula de Carga" → CANÔNICO: "Permissão Represada + Distúrbio de Prioridade + Dependência Emocional"
  * "Salvador" / "Herói da Família" → CANÔNICO: "Dependência Emocional + Culpa (APF_09 Tipos de Culpa) + Efeito Paralelo negativo da prosperidade"
  * "Ciclo do Quase" → CANÔNICO: "Pré-Queda recorrente em série"
  * "Festa no Banheiro" → CANÔNICO: "Dependência Emocional + 3 Perfis Controladores ativos simultaneamente"
  * "Obesidade Intelectual" → CANÔNICO: "Confusão Capacidade/Permissão + 'Entender o padrão não rompe o padrão'"
  * "Medo do Brilho" / "Medo de Ficar Rico" → CANÔNICO: "Dependência Emocional + Teto Financeiro + Escada da Maturidade presa no Afeto/Reconhecimento"
- REGRA DE OURO: o \`conceito_permissao_em_jogo\` deve ser o CANÔNICO. Se quiser usar apelido, use o formato "Apelido (canônico: X)". NUNCA retorne só o apelido isolado — quebra a regra #14 das proibições absolutas.
- Máximo 3 técnicas sugeridas, cada uma com: 1 frase de motivo + 1 exemplo EXATO de fala do Ramon aplicando a técnica à fala real do lead (não genérico — customizado pro contexto)
- Os exemplos devem usar palavras/expressões que o lead acabou de falar (quando cabível) — voz mesa de jantar, tom humano, pt-BR natural
- DIVERSIFIQUE técnicas. Não caia sempre em Mirror+Label+X. Considere o passo da conversa: em abertura (passos 1-3) Mirror/Label fazem sentido; em investigação (4-7) priorize Implicação/Necessidade de Solução; em apresentação (8-10) 3 Dez/Pre-handling/Storytelling; em fechamento (11-18) Looping/Isolamento/Cadeira/Close/Avanço/Risco Reverso.
- Identifique em qual passo do Caminho (1-18) a conversa está agora

REGRAS DURAS PARA \`resposta_nota_10\` (esta é a promessa — se Ramon usar, tem que ser 10):
1. TAMANHO: 2 a 4 frases curtas. MÁXIMO 60 palavras. Chamada real é ping-pong, não monólogo. Se passar disso, refaça.
2. Se a \`camada_revelada\` for "profunda" OU o lead revelou a objeção real, NOMEIE explicitamente o conceito da Teoria da Permissão em jogo (ex: "isso tem nome na nossa metodologia: Salvador — o herói da família que carrega todo mundo"). Isso é o que fecha a lacuna pra chegar em 10.
3. Combine 2 técnicas no máximo, de forma fluida. Não empilhe 4-5 técnicas numa resposta só.
4. NUNCA use construções repetitivas tipo "é X e X e X" ou frases que pareçam template corrompido. Releia antes de devolver.
5. NUNCA use clichê, religiosidade, desconto, urgência artificial, promessa de renda.
6. Termine com uma pergunta calibrada OU um gancho que devolva a vez pro lead. Nunca termine monólogo com afirmação fechada.
7. Voz mesa de jantar: informal, sem jargão corporativo, contrações naturais ("tá", "né", "pra").
8. PAUSAS INTENCIONAIS: use "..." (três pontos) pra pausa curta dentro da resposta (ênfase, quebra de padrão, respiração) e "...N" (N=1..9) pra silêncio de N segundos aplicado como técnica (ex: Silêncio Dinâmico antes de cravar Label, 4 Segundos após pergunta). Exemplo: "Posso te perguntar uma coisa? ...4 ... Você não foi mais longe porque não pôde — ainda." Use com parcimônia, só quando a técnica pedir. NÃO coloque "..." no final da frase (isso é o turn do lead, não precisa marcador). O Ramon vai LER a resposta, então a pausa só existe onde está escrita.
9. POSTURA DE CONDUÇÃO: se o lead é cru/exposto (a maioria), a nota-10 deve TRADUZIR a dor do lead pra conceito em linguagem simples e AMARRAR quando fizer sentido. Nunca devolva o diagnóstico como se o lead já soubesse. "Quem ensina é quem conduz."

10a. ORDEM INTERNA DO FECHAMENTO (crítica — a ordem importa mais que as técnicas isoladas):
   - A sequência correta é: Looping → Isolamento → Ancoragem (total antes da parcela) → Looping → Skin/Risco Reverso (se necessário) → Assumptive/Alternative Close → Avanço.
   - Se o lead ACABOU DE PERGUNTAR PREÇO, a resposta_nota_10 NUNCA joga o número direto. A ordem é: Isolamento → Ancoragem com TOTAL primeiro → Looping. Ex: "boa pergunta. Mas deixa eu te fazer outra antes — tirando o investimento, o caminho que a gente desenhou faz sentido pra você? ... porque se sim, o total é R$X, pode pagar à vista ou dividir em até Y vezes."
   - Se o Ramon ACABOU DE CITAR UM CASO REAL forte (com nome + número + transformação), e os pré-requisitos de close estão OK, a resposta_nota_10 DEVE ser Assumptive Close direto e curto: "Então bora fazer igual ele — qual cartão você prefere usar, o de crédito ou débito?" Não deixar o momento passar.
   - Ancorar SÓ a parcela ("12x de R$397") sem mencionar o total primeiro é ancoragem fraca. Sempre: total cheio → parcelamento. Essa é a âncora que quebra objeção financeira.

10. BLOQUEIO DE CLOSE PREMATURO (crítico — a nota-10 é um atalho, não pode pular o jogo):
   - Você SÓ pode sugerir técnicas de fechamento (Assumptive Close, Alternative Close, Isolamento de Preço, Risco Reverso, Avanço Concreto) na \`resposta_nota_10\` SE a conversa JÁ TEVE:
     (a) 3 Dez aplicados (Produto → Você → Aliança) OU apresentação estruturada do programa (Marca Passos nomeado + o que está incluso + estrutura);
     E (b) Ancoragem de preço (valor foi declarado);
     E (c) Isolamento mínimo (Ramon já tirou "o investimento" da frente ou vai tirar nessa própria resposta).
   - Se (a), (b) e (c) NÃO estão presentes ainda na conversa, a \`resposta_nota_10\` NÃO pode ser Close. Ela deve ser o que está FALTANDO: se falta (a), apresente o programa em 2-3 frases (Marca Passos + o que tem dentro + estrutura online); se falta (b), ancore o preço; se falta (c), faça Isolamento ("tirando o investimento, o que você pensa?").
   - O lead pode SINALIZAR disposição ("tô dentro", "quero fechar") antes do Ramon ter apresentado. NÃO CAIA NESSA ARMADILHA — o bom vendedor FREIA o fechamento e apresenta antes: "espera, antes de eu mandar o link, deixa eu te explicar exatamente o que você tá levando". Isso protege o lead do arrependimento e o Ramon do churn.
   - REGRA PRÁTICA: se nas últimas 5-6 trocas a palavra "Marca Passos" ainda não apareceu, e o preço ainda não foi declarado, NÃO sugira close direto. Sugira APRESENTAÇÃO ou ANCORAGEM.
   - Regra de exceção: sub-modo "fechamento" e sub-modo "quebra" começam DEPOIS da apresentação por design. Aí você pode sugerir close direto mesmo que Marca Passos não tenha sido nomeado nesta conversa — mas reforce no exemplo que Ramon confirme o acesso à plataforma no próprio close ("cartão parcelado, o acesso à Marca Passos cai na hora").

Responda JSON estrito, sem markdown nem fences:
{
  "possivel_objecao": "descrição em 1 frase",
  "categoria": "dinheiro | tempo | confianca | autoconhecimento | familia | decisao | duvida_produto",
  "camada_revelada": "superficial | intermediaria | profunda",
  "conceito_permissao_em_jogo": "nome OU null",
  "passo_do_caminho_sugerido": N,
  "tecnicas_sugeridas": [
    {
      "nome": "Mirror",
      "porque": "Eco das 2-3 últimas palavras faz o lead continuar se abrir",
      "exemplo": "\\"...medo de falhar de novo?\\" (pausa)"
    }
  ],
  "o_que_observar": "1 frase do que fica claro na fala do lead",
  "resposta_nota_10": "Resposta completa do Ramon — 2 a 5 frases, combinando técnicas de forma natural, fiel à voz mesa de jantar, pronta pra ser falada agora."
}`;
    const system = [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }];

    const anti_loop_hint = turn >= 12 ? `
ATENÇÃO (ANTI-LOOP): já são ${turn} turnos. Se o Ramon ainda está cavando objeção e NÃO aplicou 3 Dez / Looping / Close, a \`resposta_nota_10\` DEVE ser uma técnica de fechamento direto (Assumptive Close + Isolamento + Cadeira de Balanço combinados). Pare de dar dica de Mirror/Label agora — empurre pro fechamento. Se o Ramon apresentar 3 Dez + Looping mas o lead ainda objeta, a nota-10 combina Cadeira de Balanço + Alternative Close com método de pagamento ("cartão ou boleto?"). Chegou a hora.` : '';

    // ========= RITMO DO CAMINHO POR TURNO =========
    // Uma chamada 1×1 pós-evento REAL tem ~15-25 turnos. Comprimir o Caminho
    // em 4-5 turnos quebra o realismo. Essa regra limita o que a dica pode
    // sugerir em função do turno atual — o coach não pode saltar pra
    // apresentação/ancoragem/close se o turno é baixo demais.
    const submodoPulaAbertura = ['fechamento', 'quebra', 'duvidas'].includes(scenario.submodo);

    // ========= CASO ESPECIAL: LEAD ESTUDIOSO QUE JÁ NOMEIA PADRÃO NO TURNO 1 =========
    // Quando o lead chega no turno 1 nomeando padrão/conceito ("sou o Salvador", "vivo na Matriz da
    // Utilidade", "é Obesidade Intelectual"), o coach NÃO pode cair na armadilha de confirmar e
    // diagnosticar junto — isso aciona "nomeou_padrao_cedo". O caminho correto:
    //  (a) reconhecer o vocabulário ("pelo jeito você já estudou isso") SEM re-nomear,
    //  (b) devolver a palavra pra DOR EMOCIONAL CONCRETA por trás do nome,
    //  (c) só aprofundar diagnóstico clínico depois do turno 6-8.
    const primeiraMsgLead = conversation.find(m => m.role === 'assistant')?.content || scenario.primeira_mensagem_lead || '';
    const leadNomeouPadraoNaAbertura = /\b(salvador|mula\s+de\s+carga|padr[ãa]o|padr[õo]es|depend[eê]ncia\s+emocional|pr[eé]-queda|pre\s*queda|teto\s+financeiro|matriz\s+da\s+utilidade|escada\s+da\s+(maturidade|postura)|obesidade\s+intelectual|medo\s+do\s+brilho|herói\s+da\s+fam[íi]lia|ciclo\s+do\s+quase|defeito\s+paralelo|efeito\s+paralelo|plano\s+perfeito|permiss[ãa]o\s+represada|conversa\s+dif[íi]cil)\b/i.test(primeiraMsgLead);
    const nivelLead = (scenario.nivel_conhecimento_metodologia || 'exposto').toLowerCase();
    const caseEstudiosoQueNomeia = (nivelLead === 'estudioso' || leadNomeouPadraoNaAbertura) && turn <= 3;
    const ritmoBloco = submodoPulaAbertura ? `
RITMO DO CAMINHO (sub-modo ${scenario.submodo} — começa depois da abertura por design):
- Você pode sugerir diretamente técnicas da fase alvo do sub-modo.
- Mesmo assim, NÃO pule direto pra close se ainda não houve 3 Dez + Ancoragem + Isolamento explícito.` : `
RITMO DO CAMINHO POR TURNO (sub-modo ${scenario.submodo || 'caminho_completo'} — OBRIGATÓRIO respeitar):
- Turnos 1-3: fase de ABERTURA. passo_do_caminho_sugerido DEVE estar entre 1-3 (Permissão, Agradecimento/Abertura, Conexão com evento). NUNCA nomeie o padrão (Salvador/Dependência Emocional/etc) ainda — isso é passo 8-9. NUNCA sugira 3 Dez, Marca Passos, preço. Técnicas válidas aqui: Permissão ("posso te roubar 10min?"), Mirror curto, Label leve de sentimento genérico, Accusation Audit leve. MODELO de resposta_nota_10 turno 1: rapport curto + devolver a palavra ao lead ("cara, obrigado por atender. Me conta: o que te fez aceitar essa chamada hoje?").
- Turnos 4-8: fase de INVESTIGAÇÃO em SPIN. passo_do_caminho_sugerido DEVE estar entre 4-7 (Pergunta de Situação, Problema, Implicação, Necessidade de Solução). AQUI você pode começar a nomear padrões QUANDO o lead já revelou a dor 2+ vezes. NUNCA sugira Marca Passos, preço ou 3 Dez antes do turno 8. Técnicas válidas: Label, Pergunta de Implicação, Pergunta de Necessidade de Solução, Cadeira de Balanço, Teste Hipotético.
- Turnos 9-12: fase de APRESENTAÇÃO. passo_do_caminho_sugerido entre 8-10 (3 Dez, Storytelling, Pre-handling). AQUI sim nomeie Marca Passos, estrutura do programa, casos reais da Aliança. Ainda SEM preço. Técnicas: 3 Dez na ordem (Produto → Você → Aliança), Storytelling de cena, Pre-handling.
- Turnos 13-18: fase de FECHAMENTO. passo_do_caminho_sugerido entre 11-18 (Looping, Isolamento, Ancoragem de Preço, 3 Tons, Skin in the Game, Assumptive/Alternative Close, Avanço, Risco Reverso). AQUI libera preço + close + Risco Reverso.
- Turnos 19+: só fechamento/recuperação ou aceitar recusa explícita.

LEI INVIOLÁVEL DO RITMO:
- Se turno atual é ${turn}, o passo_do_caminho_sugerido TEM que estar no bloco correspondente. Fazer passo 9 (Apresentação) no turno 3 é FALHA DO COACH. Você estaria ensinando o Ramon a pular o Caminho e a saber disso.
- A \`resposta_nota_10\` também respeita essa lei. Se turno é 2 e você sugere "Marca Passos tem 18 aulas", você está ENSINANDO ERRADO. Refaça.
- Só quebra a lei quando o lead bloqueou o ritmo com pergunta direta (ex: lead no turno 2 pergunta "quanto custa?" — aí você responde com Pre-handling leve + devolve à investigação; NÃO ancora preço ainda).

${caseEstudiosoQueNomeia ? `
CASO ESPECIAL — LEAD ESTUDIOSO QUE JÁ NOMEOU PADRÃO NA ABERTURA:
O lead chegou no turno 1 JÁ usando vocabulário técnico (Salvador / Matriz da Utilidade / Obesidade Intelectual / etc). Isso é uma ARMADILHA pro coach — parece um convite pra ir junto e confirmar o diagnóstico, mas NÃO É. Se você confirmar e re-nomear no turno 2-3, o evaluator vai registrar armadilha "nomeou_padrao_cedo" mesmo sendo o lead que puxou o termo. O motivo: nomear padrão CEDO, antes de rapport + implicação emocional, soa como diagnóstico de consultório frio — perde autoridade em vez de ganhar.

REGRA PRA resposta_nota_10 nos turnos 1-3 NESTE CASO:
- RECONHECER que o lead tem vocabulário ("pelo jeito você já rodou pelo conteúdo, né?") SEM re-confirmar o diagnóstico.
- DEVOLVER a palavra pra DOR EMOCIONAL CONCRETA por trás do nome ("mas deixa eu te perguntar uma coisa — tirando o nome, o que pesa MAIS no peito hoje?", "esquece o nome por um segundo, me conta onde isso te machucou esta semana?").
- NÃO nomear padrão de volta. NÃO aprofundar diagnóstico técnico ainda.
- Só no turno 6-8, depois do lead descrever 2-3 cenas de dor emocional REAL, você pode confirmar o nome + amarrar ao custo prático que ele reconheceu.
- Se ignorar isso e ir direto no diagnóstico técnico, vira armadilha "nomeou_padrao_cedo" + "pulou_dor_emocional".` : ''}

PARA ESTE TURNO (${turn}) a fase esperada é: ${turn <= 3 ? 'ABERTURA (passos 1-3)' : turn <= 8 ? 'INVESTIGAÇÃO (passos 4-7)' : turn <= 12 ? 'APRESENTAÇÃO (passos 8-10)' : 'FECHAMENTO (passos 11-18)'}.`;

    // Checagens determinísticas de pré-requisitos de close — alimenta a regra 10 do bloqueio de close prematuro
    const ramonTextoCompleto = conversation
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' \n ');
    const mencionouMarcaPassos = /\bmarca[-\s]?passos\b/i.test(ramonTextoCompleto);
    const ancoragemPreco = /\b(R\$|reais|m[eê]s|parcela|anu(al|idade)|investimento|valor|custa|custo|paga\s+\d+|\d[\d\.\,]*\s*(reais|pila|conto))\b/i.test(ramonTextoCompleto);
    const fezIsolamento = /\b(tirando\s+o?\s+(investimento|valor|pre[çc]o)|fora\s+o?\s+(pre[çc]o|investimento)|independente\s+do?\s+(pre[çc]o|valor))\b/i.test(ramonTextoCompleto);
    const tresDez = /\b(3\s*dez|tr[eê]s\s*dez|produto.{0,40}voc[eê].{0,60}alian[çc]a)\b/i.test(ramonTextoCompleto);

    // Detectores contextuais: o lead acabou de perguntar preço? Ramon acabou de citar caso real?
    const leadPerguntouPreco = /\b(quanto\s+(é|custa|fica|sai|vai\s+me\s+custar)|qual\s+(o\s+)?(pre[çc]o|valor|investimento)|pre[çc]o\s+\?|valor\s+\?|me\s+fala\s+(o\s+)?(pre[çc]o|valor)|vai\s+(custar|sair)|[eé]\s+caro|[eé]\s+muito)\b/i.test(leadMessage || '');
    // PISTA INDIRETA DE PREÇO: lead não pergunta valor explicitamente mas sinaliza peso/aperto/hesitação financeira.
    // Exemplos: "tá pesado", "é muito", "caro pra mim", "não é pouco", "esse valor", "tô apertado", "orçamento curto",
    // "fora do meu bolso", "preciso ver se cabe", "pesa no bolso", "não sei se consigo", "é um investimento grande".
    // Gatilho => forçar ISOLAMENTO ("tirando o investimento, faz sentido?") ANTES de ancorar parcela/desconto.
    // Sem isolamento prévio, a ancoragem parcelada cola na objeção financeira e vira armadilha
    // "ancorou_sem_isolar" + "ancoragem_parcelada_sem_total".
    const leadPistaIndiretaPreco = /\b(t[aá]\s+(pesad[oa]|salgad[oa]|apertad[oa]|car[oa])|pesad[oa]\s+(pra\s+mim|demais|pro\s+bolso)|t[aá]\s+car[oa]|[eé]\s+muito\s+dinheiro|n[ãa]o\s+[eé]\s+pouco|sai\s+car[oa]|pesa\s+(no|pro)\s+bolso|fora\s+do?\s+(meu\s+)?(bolso|or[çc]amento)|or[çc]amento\s+(curto|apertado|aper)|t[oô]\s+apertad[oa]|apertad[oa]\s+(no|com\s+o)\s+(dinheiro|or[çc]amento|grana)|n[ãa]o\s+(sei|tenho\s+certeza)\s+se\s+(consigo|cabe|d[aá])|preciso\s+ver\s+se\s+(cabe|d[aá]|consigo)|investimento\s+(alto|grande|pesado)|valor\s+(alto|pesado|salgado|puxado|bravo)|esse\s+valor|esse\s+investimento|t[aá]\s+puxado|t[aá]\s+salgado|grana\s+(curta|apertada)|vai\s+pesar|dinheiro\s+curto|ta\s+caro|t[aá]\s+bravo)\b/i.test(leadMessage || '');
    const ultimaFalaRamon = [...conversation].reverse().find(m => m.role === 'user')?.content || '';
    const ramonCitouCasoReal = /\b(conheci|vi|atendemos|tivemos|uma\s+aluna|um\s+aluno|a\s+Daniela|o\s+Vanilton|a\s+Regiane|o\s+[ÍI]caro|o\s+Marcos|caso\s+(da|de|do)|igual\s+ao\s+seu|parecido\s+com\s+(voc[eê]|você))\b/i.test(ultimaFalaRamon) &&
                             /\b(faturou|faturando|fatura|aumentou|triplicou|multiplicou|R\$|reais|mil|hoje\s+ela|hoje\s+ele|depois\s+de\s+\d|em\s+\d+\s+meses)\b/i.test(ultimaFalaRamon);

    // ========= DETECTOR: PERFIL PROFISSIONAL CONSERVADOR =========
    // Servidor público, magistrado, auditor, professor concursado, médico, advogado,
    // policial, militar — perfis com objeções OBVIAS e recorrentes que o coach deve
    // ANTECIPAR via Pre-handling nos turnos 8-10 (antes do lead levantar).
    // Sem isso, o lead joga a objeção na hora da ancoragem e o Ramon fica reativo.
    const profissao = (scenario.persona?.profissao || '').toLowerCase();
    const perfilConservador = {
      servidor_publico: /\b(servidor|funcion[áa]ri[oa]\s+p[úu]blic[oa]|concursad[oa]|auditor|juiz|promotor|desembargador|procurador|delegado|escriv[ãa]o|fiscal|analista\s+(da\s+)?(receita|p[úu]blic)|t[eé]cnico\s+(do|da)\s+(INSS|Receita|TJ|TRE|TRT))\b/.test(profissao),
      magistrado: /\b(juiz|promotor|desembargador|procurador|magistrad[oa])\b/.test(profissao),
      militar_policial: /\b(policial|militar|soldad[oa]|sargent[oa]|tenente|capit[ãa]o|major|coronel|delegad[oa]|bomb[ei]ir[oa]|agente\s+penitenci)\b/.test(profissao),
      medico_dentista: /\b(m[eé]dic[oa]|dentista|odontolog|cirurg|enfermeir|psiquiat|pediatr|ginec)\b/.test(profissao),
      professor_academico: /\b(professor|professora|docente|pesquisador|acad[eê]mic[oa]|mestre|doutor)\b/.test(profissao) && !/\b(m[eé]dic)\b/.test(profissao),
      advogado: /\b(advogad[oa]|jur[íi]dic|causid|solicitor|procuradoria)\b/.test(profissao)
    };
    const ehPerfilConservador = Object.values(perfilConservador).some(Boolean);
    const tipoPerfilAtivo = Object.keys(perfilConservador).find(k => perfilConservador[k]);

    // Objeções típicas por perfil (pra coach sugerir Pre-handling antecipando)
    const objecoesPorPerfil = {
      servidor_publico: [
        'estabilidade vs risco ("tenho estabilidade, pra que mexer?")',
        'previsibilidade do salário vs renda variável ("não posso depender de cliente")',
        'tempo pra estudar com carga pesada ("minha rotina já é pesada")',
        'identidade do concurso ("mas eu sou servidor, não sei fazer outra coisa")'
      ],
      magistrado: [
        'imagem pública / risco reputacional ("e se meu pares souberem?")',
        'rotina com volume de processos ("não tenho tempo")',
        'vedação constitucional equivocada ("posso ter outra atividade?")'
      ],
      militar_policial: [
        'hierarquia / horário rígido ("minha escala não deixa")',
        'rotina de estresse físico ("chego exausto")',
        'cultura de "pro concurso" ("meu plano é concurso maior")'
      ],
      medico_dentista: [
        'plantão e rotina exausta ("trabalho 60h por semana")',
        'identidade como prestador de serviço ("sou médico, não empresário")',
        'já ganha bem, objeção de complacência ("tô bem, pra que mudar?")'
      ],
      professor_academico: [
        'identidade intelectual vs "comercial" ("eu sou de pesquisa, não de venda")',
        'salário baixo real mas peso da estabilidade ("ganho pouco mas é certo")',
        'ciclo de férias como álibi ("vou aproveitar as férias pra estudar")'
      ],
      advogado: [
        'OAB / horas faturáveis ("cobro por hora, não posso parar")',
        'identidade de bastião familiar ("preciso sustentar o escritório")',
        'medo da exposição pública ("minha imagem é tudo")'
      ]
    };

    const preHandlingBloco = (ehPerfilConservador && turn >= 6 && turn <= 11) ? `
PRÉ-HANDLING OBRIGATÓRIO — PERFIL PROFISSIONAL CONSERVADOR (${tipoPerfilAtivo.replace('_', ' ')}):
O lead é ${scenario.persona?.profissao}. Perfil com objeções ALTAMENTE PREVISÍVEIS. Nos turnos 8-11 (Apresentação → pré-fechamento), a resposta_nota_10 DEVE antecipar 1-2 dessas objeções antes do lead levantar. Isso é Pre-handling de 3 Objeções.

Objeções típicas desse perfil:
${(objecoesPorPerfil[tipoPerfilAtivo] || []).map(o => `- ${o}`).join('\n')}

MODELO de Pre-handling embutido na resposta_nota_10 (turno 8-10):
"Olha, antes da gente seguir, deixa eu antecipar o que normalmente passa pela cabeça de quem é ${scenario.persona?.profissao}: primeiro, [OBJEÇÃO 1 — formulada como fato da categoria, não acusação]; segundo, [OBJEÇÃO 2]. Você tá sentindo algo parecido, ou é outro lugar que tá pegando?"

Não aplicar Pre-handling aqui → armadilha "perdeu_prehandling_perfil". Coach sugeriu o que precisava? Se sim, o lead chega no fechamento sem poder jogar esse coringa na sua cara.` : '';
    // Frases como "que sistema é esse?", "como funciona?", "me explica o que é isso",
    // "quanto custa?", "não vou entrar sem saber" são PEDIDOS INEQUÍVOCOS de 3 Dez + ancoragem.
    // Ignorar esse gatilho → armadilha "lead_pediu_apresentacao_ignorou" (perde a venda).
    // Também inclui caso onde lead diz "não entro em furada sem saber" (condicional informativa).
    const leadPediuApresentacao = /\b(que\s+sistema\s+é\s+esse|qual\s+[eé]\s+(o\s+)?sistema|que\s+programa|como\s+funciona|como\s+[eé]\s+(o\s+)?(programa|esse|isso)|o\s+que\s+[eé]\s+(isso|esse|esso|a\s+alian[çc]a|o\s+programa|a\s+marca)|me\s+expl(ica|ique|ic)|me\s+fala|me\s+mostra|me\s+detalha|preciso\s+(saber|entender|ver)|quero\s+(saber|entender|ver)|o\s+que\s+(voc[eê]|cê)\s+(t[aá]|est[aá])\s+(ofere|me\s+ofere)|quanto\s+custa|quanto\s+[eé]|qual\s+(o\s+)?(pre[çc]o|valor|investimento)|me\s+d[aá]\s+(mais\s+)?detalh|me\s+traz\s+detalh)\b/i.test(leadMessage || '') ||
                                  /\b(n[ãa]o\s+(vou\s+)?(entrar|fechar|comprar|assinar|fazer))\b[^.!?]{0,60}\b(sem\s+saber|sem\s+entender|antes\s+de\s+(saber|entender|ver|conhecer)|no\s+escuro|a\s+cegas)/i.test(leadMessage || '');

    const jaApresentou = mencionouMarcaPassos || tresDez;

    const preRequisitosClose = {
      apresentacao_estruturada: mencionouMarcaPassos || tresDez,
      ancoragem_preco: ancoragemPreco,
      isolamento_feito: fezIsolamento,
      submodo_ja_fechamento: ['fechamento', 'quebra'].includes(scenario.submodo)
    };
    const podeSugerirClose =
      preRequisitosClose.submodo_ja_fechamento ||
      (preRequisitosClose.apresentacao_estruturada && preRequisitosClose.ancoragem_preco);

    const preReqBloco = `
PRÉ-REQUISITOS DE CLOSE (checagem sistêmica — NÃO ignore):
- Marca Passos nomeada pelo Ramon nesta conversa? ${preRequisitosClose.apresentacao_estruturada ? 'SIM' : 'NÃO'}
- Preço/investimento ancorado? ${preRequisitosClose.ancoragem_preco ? 'SIM' : 'NÃO'}
- Isolamento de preço feito? ${preRequisitosClose.isolamento_feito ? 'SIM' : 'NÃO'}
- Sub-modo já é de fechamento por design? ${preRequisitosClose.submodo_ja_fechamento ? 'SIM' : 'NÃO'}
- PODE sugerir Close na resposta_nota_10? ${podeSugerirClose ? 'SIM' : 'NÃO — sugira Apresentação/Ancoragem/Isolamento PRIMEIRO, não Close.'}

GATILHOS CONTEXTUAIS IMEDIATOS (respondem ao QUE ACONTECEU neste turno):
- Lead acabou de PERGUNTAR PREÇO? ${leadPerguntouPreco ? 'SIM' : 'NÃO'}${leadPerguntouPreco ? ' → REGRA: a resposta_nota_10 NÃO pode ser ancoragem direta. Antes de jogar o número, faça ISOLAMENTO ("deixa eu te perguntar antes: tirando o investimento, o caminho faz sentido pra você?"). Isso separa objeção financeira da objeção real. Só DEPOIS do sim, ancore com TOTAL primeiro ("é R$X total, pode dividir em até Y vezes"), nunca só a parcela.' : ''}
- Ramon ACABOU de citar CASO REAL forte (com nome, número concreto, transformação)? ${ramonCitouCasoReal ? 'SIM' : 'NÃO'}${ramonCitouCasoReal ? ' → REGRA: caso real forte é gatilho de CLOSE. Se os pré-requisitos de close estão OK (apresentação + ancoragem + isolamento), a próxima resposta_nota_10 DEVE ser Assumptive Close simples e curto: "E então, qual cartão você prefere usar?" ou "Tá, vou te mandar o link — cartão à vista ou parcelado?". Deixar o momento passar é armadilha "perdeu_momento_close".' : ''}
- Lead acabou de PEDIR APRESENTAÇÃO ("que sistema?", "como funciona?", "me explica", "quanto custa?", "não vou entrar sem saber")? ${leadPediuApresentacao ? 'SIM — GATILHO OBRIGATÓRIO DE APRESENTAÇÃO ESTRUTURADA' : 'NÃO'}
- Lead deu PISTA INDIRETA DE PREÇO ("tá pesado", "é muito", "caro pra mim", "não é pouco", "tô apertado", "fora do bolso", "valor puxado")? ${leadPistaIndiretaPreco ? 'SIM' : 'NÃO'}${leadPistaIndiretaPreco ? ` → REGRA CRÍTICA: o lead ABRIU a porta da objeção financeira SEM perguntar valor. NÃO caia na armadilha de responder com parcelamento/desconto agora — isso vira "ancorou_sem_isolar" + "ancoragem_parcelada_sem_total" (cap 5 na nota). A resposta_nota_10 DEVE ser ISOLAMENTO antes de qualquer número: "Entendi — deixa eu te perguntar uma coisa ANTES do valor: tirando o investimento, o caminho em si faz sentido pra você? Você conseguiria ver você dentro desse processo?" Isso separa a dor financeira da dor real. Só DEPOIS do sim ao caminho você ancora (TOTAL primeiro, depois parcela) e só DEPOIS do sim à ancoragem, você fecha. Pular essa etapa = perder a venda pra objeção financeira que era só superfície.` : ''}
- Marca Passos já foi apresentada nesta conversa? ${jaApresentou ? 'SIM' : 'NÃO'}
${leadPediuApresentacao ? `
🚨 REGRA ABSOLUTA — LEAD PEDIU APRESENTAÇÃO:
Quando o lead pede "o que é / como funciona / quanto custa / me explica" (OU diz variantes condicionais tipo "não vou entrar sem saber o que é"), a resposta_nota_10 NUNCA pode ser pergunta de investigação, Mirror, Label, Cadeira de Balanço ou qualquer cavada. Ele já falou "me mostra o produto". Ignorar isso é armadilha NOMEADA "lead_pediu_apresentacao_ignorou" — cap 4 na nota do turno.

${jaApresentou ? '- Marca Passos já foi apresentada → a resposta_nota_10 deve CONFIRMAR COM VALOR (ancorar preço total + parcelamento) + Isolamento leve. Ex: "Sim, é a Aliança Divergente dentro da Marca Passos. 8 meses de plataforma com os módulos X, Y, Z, acesso imediato online. Investimento é R$ X total, pode parcelar em até 12x de R$ Y. Tirando o valor, faz sentido o caminho pra você?"' : '- Marca Passos AINDA NÃO foi apresentada → a resposta_nota_10 É OBRIGATORIAMENTE APRESENTAÇÃO ESTRUTURADA. Siga este template (adapte ao tom do lead): "Deixa eu te mostrar. É o programa da Aliança Divergente — a gente trabalha dentro da nossa plataforma (Marca Passos) durante [DURAÇÃO]. Você tem acesso imediato online, com módulos semanais sobre [2-3 pilares]. Não é curso gravado que você assiste sozinho — tem [elemento vivo/acompanhamento]. O investimento é R$X total (pode parcelar em Y vezes de R$Z). Deixa eu te perguntar uma coisa antes — tirando o investimento, faz sentido pra você?" — 3-5 frases, Marca Passos nomeada + estrutura + preço total + Isolamento.'}

- NÃO pule o preço. O lead perguntou diretamente "quanto custa?" — não responder com número é fugir, e o lead vai classificar como tentativa de enrolar.
- passo_do_caminho_sugerido OBRIGATORIAMENTE entre 9 e 12 (Apresentação → Ancoragem).
- Se conceito_permissao_em_jogo, NÃO é o momento de trazer novo padrão — foque no PRODUTO.
` : ''}`;

    // ========= BLOCO PÓS-ACEITE (passos 17-18 — Avanço Concreto + Confirmação) =========
    // Quando o lead já deu aceite verbal + nomeou método de pagamento, a conversa entra
    // em FASE DE FECHAMENTO CONCRETO. A resposta_nota_10 aqui NÃO é mais técnica de
    // venda — é EXECUÇÃO do envio do link + pedido de confirmação + garantia de acesso.
    const isAwaitingPayment = !!awaitingPaymentConfirmation;
    const gapAceite = (typeof turnosDesdeAceite === 'number') ? turnosDesdeAceite : 0;

    // Detecta se o Ramon JÁ enviou o link / pediu confirmação numa fala anterior
    const ramonJaEnviouLink = /\b(mandei|mando|mandando|envi(ei|o|ando)|te\s+mand(ei|o)|acabei\s+de\s+(mandar|enviar)|o\s+link\s+(t[aá]|est[aá]|segue|vai|foi)|link\s+(no|pelo|via)\s+(whats|email|zap))\b/i.test(ramonTextoCompleto);
    const ramonPediuConfirmacao = /\b(confirma\s+(quando|a[ií]|comigo)|avisa\s+(quando|a[ií])|me\s+avisa\s+(quando|a[ií])|assim\s+que\s+(pagar|receber|chegar)|apareceu\s+a\s+confirma|deu\s+certo\s+a[ií])\b/i.test(ramonTextoCompleto);
    const ramonConfirmouAcesso = /\b(acesso\s+(libera|cai|chega|abre|t[aá]\s+liberado|j[aá]\s+liberado|imediato|na\s+hora)|entra\s+(l[aá]|na\s+plataforma)|login\s+(é|vai|chega)|email\s+(de|do)\s+acesso)\b/i.test(ramonTextoCompleto);

    const postAceiteBloco = isAwaitingPayment ? `
========= ESTÁGIO PÓS-ACEITE (CRÍTICO — PASSOS 17-18) =========
SITUAÇÃO: O lead JÁ deu aceite verbal + nomeou método de pagamento (há ${gapAceite} turno(s)). A venda NÃO está fechada ainda — o sistema só registra venda_realizada quando o LEAD CONFIRMAR que o pagamento foi EFETIVADO. A missão do Ramon AGORA é executar o Avanço Concreto (passo 17) e Confirmação de Acesso (passo 18).

Checagem de execução do fechamento concreto pelo Ramon nesta conversa:
- Já mandou o link explicitamente? ${ramonJaEnviouLink ? 'SIM' : 'NÃO'}
- Já pediu confirmação de pagamento? ${ramonPediuConfirmacao ? 'SIM' : 'NÃO'}
- Já confirmou o acesso à Marca Passos? ${ramonConfirmouAcesso ? 'SIM' : 'NÃO'}

REGRAS PRA resposta_nota_10 NESTE ESTÁGIO:
1. A resposta_nota_10 JAMAIS pode ser técnica abstrata de fechamento nova (Looping, Isolamento, Risco Reverso). O lead JÁ aceitou. Qualquer técnica nova aqui é PERDER A VENDA por desnecessidade (armadilha "perdeu_momento_close_pos_aceite").
2. A resposta_nota_10 DEVE ser UMA das três execuções concretas, ESCOLHENDO A QUE ESTÁ FALTANDO:
   (A) Se Ramon AINDA NÃO mandou o link: resposta_nota_10 envia explicitamente + pede confirmação. Modelo: "Fechou. Te mandei agora o link no seu whatsapp ([nome do lead]) — pode abrir e pagar com o cartão parcelado que você escolheu. Me avisa aí assim que aparecer a confirmação na tela?"
   (B) Se Ramon JÁ mandou o link mas ainda não recebeu confirmação: resposta_nota_10 é um check-in curto + garantia do acesso. Modelo: "Chegou o link aí? Assim que você confirmar o pagamento, o acesso à Marca Passos libera automático no email que você me passou — já dá pra entrar e começar hoje."
   (C) Se lead relatou atrito ("não chegou", "cartão recusou"): resposta_nota_10 resolve a fricção concreta SEM re-vender. Modelo: "Peraí, vou reenviar agora — você prefere pelo whats ou email? E se o cartão travou, tenta pelo boleto que libera hoje à noite mesmo."
3. TOM: calmo, assertivo, executivo. Nada de "parabéns pela decisão" sem link. Nada de filosofia. APENAS execução + confirmação.
4. NO passo_do_caminho_sugerido deve ser 17 (Avanço Concreto) ou 18 (Aceite/Confirmação), NUNCA 11-16 de novo.
5. EVITE ABSOLUTAMENTE: repetir 3 Dez, re-aplicar Looping, re-ancorar preço, adicionar urgência, oferecer desconto. A venda JÁ foi feita verbalmente — a tarefa é AMARRAR.
6. Se gap >= 2 turnos sem Ramon executar envio do link, o "o_que_observar" deve alertar: "Lead já aceitou há ${gapAceite} turnos. Ramon está perdendo a venda por NÃO executar o envio do link. Armadilha: 'dorme_no_ponto'."
========================================================` : '';

    const user = `Persona: ${scenario.persona.nome}, padrão: ${scenario.padrao_oculto_teoria_permissao}.
Objeção superficial: ${scenario.objecao_superficial}
Objeção real: ${scenario.objecao_real}
Nível de conhecimento da metodologia: ${scenario.nivel_conhecimento_metodologia || 'exposto'}
Vocabulário que o lead já usa: ${JSON.stringify(scenario.vocabulario_que_usa || [])}
${ritmoBloco}
${preReqBloco}
${preHandlingBloco}
${postAceiteBloco}
${anti_loop_hint}

ATENÇÃO SOBRE POSTURA:
- A MAIORIA dos leads é CRU (40%) ou EXPOSTO (50%). Eles chegam com DOR em linguagem comum, NÃO com diagnóstico técnico pronto.
- Quem CONDUZ é o Ramon: ele escuta a dor, traduz pro conceito em linguagem simples, amarra conceitos soltos.
- Se o lead é CRU, a nota-10 apresenta o conceito em linguagem acessível (mesa de jantar), sem jargão.
- Se o lead é EXPOSTO, a nota-10 usa os termos que o lead já ouviu SEM explicar do zero, mas também SEM presumir que ele dominou — personaliza com o dado específico dele, amarra 2 conceitos se fizer sentido, leva pra aplicação.
- Se o lead é ESTUDIOSO (raro, 10%), confronte Obesidade Intelectual e leve pra ação imediata.

Últimas trocas:
${conversation.slice(-4).map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}

FALA RECÉM-CHEGADA DO LEAD (turno ${turn}):
"${leadMessage}"

Devolva o JSON.`;

    try {
      const { text } = await ClaudeAPI.call({
        system, messages: [{ role: 'user', content: user }],
        max_tokens: 900, temperature: 0.5
      });
      return ClaudeAPI.extractJSON(text);
    } catch (err) {
      console.warn('leadHint falhou:', err);
      return null;
    }
  }

  // ========= DETECÇÃO DE QUEBRA DE PERSONAGEM DO LEAD =========
  // Retorna { broken: bool, reason: string } se a resposta soa como coach/observador
  // em vez de 1ª pessoa com dor.
  function detectLeadCharacterBreak(text, leadName) {
    if (!text || !text.trim()) return { broken: false };
    const t = text.trim();
    const nome = (leadName || '').trim();

    // 1. Começa chamando a si mesmo pelo nome em 2ª pessoa ("Thiago, você...")
    if (nome) {
      const reSelf = new RegExp(`^${nome}\\s*,\\s*(voc[eê]|tu)\\b`, 'i');
      if (reSelf.test(t)) return { broken: true, reason: `self_address_by_name: começou com "${nome}, você..."` };
    }

    // 2. Padrões de coach/observador olhando pro Ramon de fora
    const coachPatterns = [
      /\bvoc[eê]\s+acabou\s+de\s+fazer\s+exatamente\b/i,
      /\bvoc[eê]\s+est[aá]\s+fazendo\s+(exatamente\s+)?o\s+que\s+sempre\s+faz\b/i,
      /\bparece\s+que\s+voc[eê]\s+(est[aá]|sempre|acabou)/i,
      /\bo\s+que\s+voc[eê]\s+est[aá]\s+fazendo\s+aqui\s+[eé]\b/i,
      /\bdeixa\s+eu\s+te\s+(perguntar|dizer|falar|mostrar)\s+(uma\s+coisa|o\s+que)/i,
      /\bthat'?s\s+right\b/i,
      /\bme\s+conta\s+mais\s+sobre\b/i,
      /\bo\s+que\s+voc[eê]\s+sente\s+quando\b/i,
      /\bisso\s+(que\s+voc[eê]\s+faz\s+)?tem\s+um?\s+nome\s*:\s*(padr[ãa]o|depend[eê]ncia|permiss[aã]o|salvador|mula)/i,
      /\bna\s+verdade,?\s+(isso\s+)?[eé]\s+uma?\s+(depend[eê]ncia\s+emocional|permiss[aã]o\s+represada|matriz\s+da\s+utilidade)/i,
      /\b(reconhece|reconheceu)\s+o\s+problema\s+e\s+(na\s+mesma\s+respira[çc][aã]o|usa)/i,
    ];
    for (const re of coachPatterns) {
      if (re.test(t)) return { broken: true, reason: `coach_pattern: ${re.source.slice(0, 60)}` };
    }

    return { broken: false };
  }

  // ========= RESPOSTA DO LEAD =========
  async function leadResponse({ scenario, conversation, data, leadCederCamada, leadEndurecer, podeFechar, turn, closeAttempts, turnosDesdeUltimaCessao, awaitingPaymentConfirmation, turnosDesdeAceite }) {
    const leadSystem = Scenarios.buildLeadSystemPrompt({ scenario, data });
    const ramonTurns = Math.max(1, turn || Math.ceil(conversation.length / 2));
    const attempts = closeAttempts || 0;
    const turnosDesdeCessao = (typeof turnosDesdeUltimaCessao === 'number') ? turnosDesdeUltimaCessao : 99;
    const podeCederAgora = turnosDesdeCessao >= 3;
    const isAwaitingPayment = !!awaitingPaymentConfirmation;
    const gapAceite = (typeof turnosDesdeAceite === 'number') ? turnosDesdeAceite : 0;

    // Detecta se o Ramon já tentou fechar o loop (mandou link, pediu confirmação)
    const ultimaFalaRamonTexto = [...conversation].reverse().find(m => m.role === 'user')?.content || '';
    const ramonEnviouLinkAgora = /\b(mandei|mando|mandando|envi(ei|o|ando)|te\s+mand(ei|o)|acabei\s+de\s+(mandar|enviar)|o\s+link\s+(t[aá]|est[aá]|segue|vai|foi)|link\s+(no|pelo|via)\s+(whats|email|zap)|confirma\s+(quando|a[ií])|avisa\s+quando|me\s+avisa\s+(quando|a[ií])|assim\s+que\s+(pagar|receber|chegar)|acesso\s+(libera|cai|chega|abre))\b/i.test(ultimaFalaRamonTexto);

    let cue = '';
    if (isAwaitingPayment) {
      // ============ PÓS-ACEITE: estágio B do fechamento (passos 17-18) ============
      if (ramonEnviouLinkAgora) {
        // Ramon está executando o Avanço Concreto corretamente.
        // 70% confirma pagamento, 30% reporta atrito leve (dificuldade difícil/hostil).
        const dif = (scenario?.dificuldade || 'medio').toLowerCase();
        const rollAtrito = Math.random();
        const chanceAtrito = dif === 'dificil' || dif === 'hostil' ? 0.35 : 0.15;
        if (rollAtrito < chanceAtrito && gapAceite <= 1) {
          // Atrito leve — uma vez só, na primeira resposta pós-envio
          cue = '[CUE INTERNO — PÓS-ACEITE: ATRITO LEVE] Ramon te mandou o link agora. Reaja com atrito REAL e curto (1-2 frases): "peraí, não chegou nada ainda, você mandou pra qual número?" OU "cara, o cartão recusou aqui, tem outro jeito?" OU "qual email você mandou? não achei". NÃO desista da venda — é só fricção técnica. Espera o Ramon resolver.';
        } else {
          // Confirma pagamento de forma INEQUÍVOCA (nomeando termo que o sistema capta)
          cue = '[CUE INTERNO — PÓS-ACEITE: CONFIRMA PAGAMENTO] Ramon te mandou o link e/ou pediu confirmação. VOCÊ DEVE CONFIRMAR o pagamento de forma INEQUÍVOCA, usando UM destes termos (obrigatório pro sistema registrar): "paguei, deu certo" / "pagamento confirmado" / "apareceu a confirmação" / "já tá pago" / "chegou o email de acesso" / "entrei na plataforma" / "recebi o acesso". 1-2 frases, tom de quem fechou com alívio ou animação. Pode encerrar com agradecimento curto. NÃO invente nova dúvida nem objeção — o fechamento terminou.';
        }
      } else {
        // Ramon NÃO está executando o Avanço Concreto — precisa forçar.
        if (gapAceite <= 1) {
          cue = '[CUE INTERNO — PÓS-ACEITE: RAMON NÃO MANDOU LINK] Você já disse que quer fechar e nomeou o método. Mas o Ramon não mandou o link nem pediu confirmação de pagamento ainda. FREIE com educação mas com firmeza: "peraí, você vai me mandar o link ou não? Onde eu pago?" OU "então me manda o link aí que eu pago agora". 1-2 frases — não se abra em camadas novas, não traga dúvida nova; só pressione pelo Avanço Concreto.';
        } else {
          cue = `[CUE INTERNO — PÓS-ACEITE: RAMON ENROLANDO] Já faz ${gapAceite} turnos desde seu aceite e o Ramon ainda não mandou o link nem pediu confirmação. ESFRIE e PRESSIONE: "cara, tô meio confuso — a gente vai fechar isso ou não? Me manda o link de uma vez." OU "olha, eu tô com o cartão na mão há ${gapAceite} mensagens, ou você manda o link agora ou eu deixo pra outra hora". 1-2 frases, tom levemente impaciente. NÃO desista ainda, mas cobre execução.`;
        }
      }
    } else if (podeFechar) {
      cue = '[CUE INTERNO] Ramon conduziu bem (3 Dez aplicados + técnica de fechamento). VOCÊ DEVE FECHAR AGORA: diga SIM de forma inequívoca, NOMEANDO método de pagamento (cartão à vista/parcelado OU boleto) e perguntando sobre o acesso à plataforma Marca Passos. Ex: "Tô dentro. Cartão parcelado. Me manda o link?" Ou "Quero entrar. Boleto. Quando chega o acesso?" SEM respostas vagas tipo "bora" ou "fecha aí" — seja CONCRETO. 1-2 frases.';
    } else if (leadEndurecer) {
      cue = '[CUE INTERNO] Ramon caiu em armadilha. Responda SECO, fechado. 1-2 frases.';
    } else if (leadCederCamada && podeCederAgora) {
      cue = '[CUE INTERNO] Ramon aplicou técnica precisa E você não cedeu camada nos últimos 3 turnos. Pode ceder UMA camada agora — revele algo mais próximo da objeção real, mas não entregue tudo. 2-3 frases. Deixe pelo menos UMA ressalva/dúvida no ar (pessoa real não é cera mole).';
    } else if (leadCederCamada && !podeCederAgora) {
      cue = `[CUE INTERNO] Ramon aplicou técnica precisa MAS você cedeu uma camada há só ${turnosDesdeCessao} turno(s). Pessoa real não cede em avalanche. Em vez de revelar mais profundidade, RECONHEÇA sem abrir ("faz sentido o que você tá dizendo... deixa eu pensar") OU endureça ("espera, agora tô achando que você tá me empurrando alguma coisa") OU traga NOVA objeção superficial ("tá, mas e o meu caso que é diferente porque..."). NÃO revele mais dor agora. 2-3 frases.`;
    }

    // ANTI-LOOP — força decisão binária depois de 2+ tentativas de fechamento OU conversa longa sem rumo
    if (attempts >= 2 && !podeFechar) {
      cue += `\n[ANTI-LOOP] Ramon já tentou fechar ${attempts} vezes sem cumprir os pré-requisitos (3 Dez + Looping + Close). Você começa a mostrar CANSAÇO — não pode ficar em "vou pensar" pela terceira vez. Ou você pede pra ele ir ao ponto ("cara, você tá me oferecendo o quê exatamente?"), ou RESOLVE a conversa (recusa explícita: "olha, não vou fechar agora, melhor não"). Nada de "me dá uns dias" de novo.`;
    } else if (ramonTurns >= 12 && attempts === 0) {
      cue += `\n[ANTI-LOOP] Já são ${ramonTurns} turnos e o Ramon ainda não tentou fechar nem apresentou 3 Dez. Demonstre impaciência: "cara, tô meio perdido, a gente fecha isso ou não?". Força a agulha.`;
    }

    const baseMsgs = conversation.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
    if (cue) baseMsgs.push({ role: 'user', content: `(Sistema) ${cue}\n\nAgora responda à última fala do Ramon em 1-3 frases, como a persona.` });

    const leadName = scenario?.persona?.nome || '';

    // 1ª tentativa normal — Haiku 4.5 (output curto, baixo impacto na calibração)
    let { text } = await ClaudeAPI.call({
      system: leadSystem, messages: baseMsgs,
      max_tokens: 400, temperature: 0.95,
      model: ClaudeAPI.MODEL_HAIKU
    });
    let out = (text || '').trim();

    // Se o lead quebrou personagem (virou coach, chamou a si mesmo pelo nome), refaz UMA vez
    // com correção injetada explicitando o erro.
    const check = detectLeadCharacterBreak(out, leadName);
    if (check.broken) {
      console.warn('[leadResponse] quebra de personagem detectada, refazendo:', check.reason);
      const correctionMsgs = baseMsgs.concat([{
        role: 'assistant', content: out
      }, {
        role: 'user', content: `(Sistema — CORREÇÃO URGENTE) Sua resposta anterior quebrou personagem: ${check.reason}. Você NÃO é coach do Ramon. Você é ${leadName}, um LEIGO com dor, confusão e desconfiança — não um observador externo do Ramon nem de si mesmo. REFAÇA sua resposta em 1ª pessoa, contando a SUA reação/dor/confusão à última fala do Ramon. NUNCA comece com o seu próprio nome em 2ª pessoa. NUNCA diagnostique o Ramon. NUNCA use técnicas de coach/Mirror/Label. Apenas reaja como gente que tá sendo tocada: pode admitir ("caralho, é isso mesmo"), pode resistir ("não sei, acho que é mais complicado"), pode pedir tempo ("deixa eu pensar"). 2-3 frases. Refaça AGORA.`
      }]);
      try {
        const retry = await ClaudeAPI.call({
          system: leadSystem, messages: correctionMsgs,
          max_tokens: 400, temperature: 0.85,
          model: ClaudeAPI.MODEL_HAIKU
        });
        const retryOut = (retry.text || '').trim();
        if (retryOut && !detectLeadCharacterBreak(retryOut, leadName).broken) {
          out = retryOut;
        } else if (retryOut) {
          // Retry ainda quebrado — sanitiza o começo (remove "Nome, você" se existir)
          out = retryOut.replace(new RegExp(`^${leadName}\\s*,\\s*`, 'i'), '').trim();
        }
      } catch (err) {
        console.warn('[leadResponse] retry falhou, mantendo original sanitizada:', err.message);
        out = out.replace(new RegExp(`^${leadName}\\s*,\\s*`, 'i'), '').trim();
      }
    }

    return out;
  }

  // ========= RELATÓRIO FINAL =========
  async function finalReport({ scenario, conversation, turnFeedbacks, passosCumpridos, data, sessionClosed, reachedMaxTurns, endReason, leadDesistiu }) {
    const n = turnFeedbacks.length;
    if (n === 0) return { nota_final: 0, frase_caderno: '', outcome: 'encerrada_parcial', outcome_motivo: 'Sessão sem turnos avaliados.', melhores_3_tecnicas: [], piores_3_pontos: [], por_momento: {}, is_parcial: true };

    const avg = (k) => turnFeedbacks.reduce((a, f) => a + (f.notas?.[k] || 0), 0) / n;
    const notas = {
      escuta: avg('escuta'),
      investigacao: avg('investigacao'),
      apresentacao: avg('apresentacao'),
      fechamento: avg('fechamento'),
      fidelidade: avg('fidelidade')
    };
    const nota_final = (notas.escuta * 0.2 + notas.investigacao * 0.2 + notas.apresentacao * 0.2 + notas.fechamento * 0.25 + notas.fidelidade * 0.15);

    const tecAcc = {};
    turnFeedbacks.forEach(f => {
      const t = f.tecnicas_aplicadas || {};
      Object.keys(t).forEach(k => { if (t[k]) tecAcc[k] = (tecAcc[k] || 0) + 1; });
    });

    const caminhoTotal = (data.caminho_18_passos?.passos || []).length || 18;
    const coberturaPct = Math.round((passosCumpridos.length / caminhoTotal) * 100);

    // ===== OUTCOME DETERMINÍSTICO (critério do sistema, não LLM) =====
    // Regras (em ordem de precedência):
    //   sessionClosed=true  → "venda_realizada" (pode_fechar + pagamento/aceite final)
    //   leadDesistiu=true   → "venda_nao_realizada_desistencia" (lead recusou explicitamente)
    //   endReason='usuario_encerrou' → "encerrada_parcial" (relatório parcial pedido pelo Ramon)
    //   reachedMaxTurns=true → "venda_nao_realizada_tempo" (bateu teto sem close nem desistência)
    let outcomeDeterministico;
    let isParcial = false;
    if (sessionClosed) {
      outcomeDeterministico = 'venda_realizada';
    } else if (leadDesistiu || endReason === 'lead_desistiu') {
      outcomeDeterministico = 'venda_nao_realizada_desistencia';
    } else if (endReason === 'usuario_encerrou') {
      outcomeDeterministico = 'encerrada_parcial';
      isParcial = true;
    } else if (reachedMaxTurns || endReason === 'max_turns') {
      outcomeDeterministico = 'venda_nao_realizada_tempo';
    } else {
      outcomeDeterministico = 'venda_nao_realizada';
    }

    const motivoSistemicoMap = {
      'venda_realizada': 'Ramon criou condição de fechamento (pode_fechar=true) E o lead sinalizou aceite final / compromisso de pagamento na última fala.',
      'venda_nao_realizada_desistencia': 'Lead sinalizou desistência explícita (recusa definitiva). Sessão encerrou sem venda.',
      'encerrada_parcial': 'Ramon encerrou a sessão manualmente antes de chegar ao fechamento. Este é um RELATÓRIO PARCIAL — analise o que foi feito até aqui e indique o que faltava pra fechar.',
      'venda_nao_realizada_tempo': 'Bateu o teto de turnos sem o lead sinalizar aceite nem desistir. Conversa se esticou sem condução ao fechamento.',
      'venda_nao_realizada': 'Sessão encerrou sem fechamento nem desistência registrada.'
    };
    const motivoSistemico = motivoSistemicoMap[outcomeDeterministico] || motivoSistemicoMap['venda_nao_realizada'];

    // ===== BREAKDOWN POR MOMENTO =====
    // Mapeamento: Abertura (passos 1-3), Condução (4-10), Fechamento (11-18)
    const momentoDoPasso = (p) => p <= 3 ? 'abertura' : p <= 10 ? 'conducao' : 'fechamento';
    const turnosPorMomento = { abertura: [], conducao: [], fechamento: [] };
    turnFeedbacks.forEach((f, i) => {
      const passo = f.passo_do_caminho_executado || f.passo_do_caminho_ideal_agora;
      if (passo) {
        const m = momentoDoPasso(passo);
        turnosPorMomento[m].push({ turn: i + 1, feedback: f });
      }
    });

    const armadilhasCometidas = turnFeedbacks
      .map((f, i) => f.armadilha_cometida ? { turno: i + 1, armadilha: f.armadilha_cometida, ajuste: f.ajuste } : null)
      .filter(Boolean);

    const system = `Você é coach sênior da Aliança Divergente avaliando UMA sessão completa de treino de vendas (Arena 2 — chamada 1×1 pós-evento).

Sua função: emitir um mini-relatório final com:
1. uma frase cirúrgica pro caderno do Ramon (10-22 palavras, voz mesa de jantar, sem clichê)
2. OUTCOME_MOTIVO — por que deu venda / por que não deu, em 1-2 frases concretas
3. 3 melhores técnicas aplicadas (mais impactantes na sessão) com momento da chamada e evidência textual
4. 3 piores pontos (armadilhas, técnicas faltantes críticas, ou aplicadas mal) com momento e correção concreta
5. análise por MOMENTO DA CHAMADA: Abertura (passos 1-3), Condução (4-10), Fechamento (11-18) — cada um com nota 0-10, ponto forte, ponto fraco e 1 sugestão concreta

Seja específico. Cite frases/palavras exatas do Ramon quando possível. Não elogie genérico. Não dê conselho motivacional.

Outcome já está decidido deterministicamente pelo sistema — você NÃO decide outcome, só EXPLICA o motivo.

PROIBIÇÕES AO SUGERIR (regras absolutas da Aliança — violá-las vira orientação ruim pro Ramon):
- NUNCA sugira criar "urgência temporal", "urgência artificial", "escassez", "é agora ou nunca". Urgência artificial é armadilha #6 da lista de proibições — fugir dela é parte do método. Se o fechamento foi fraco, sugira Isolamento, Looping, Skin in the Game, Cadeira de Balanço, Risco Reverso, Ponto Cego — NÃO urgência.
- NUNCA sugira desconto, "parcelado especial", "liberação por hoje", bônus empilhados, renda rápida.
- NUNCA sugira clichê motivacional ("acredite", "você consegue").
- NUNCA sugira ressignificação ("contar uma nova história sobre o passado").
- Se precisar sugerir uma técnica de pressão, use SÓ: Pergunta de Implicação, Cadeira de Balanço, Best/Worst Case, Pre-handling de próximos passos, Isolamento de Preço, Assumptive Close, Alternative Close, Risco Reverso.

PENALIDADE DE SESSÃO MUITO CURTA:
- Uma chamada 1×1 pós-evento high-ticket REAL exige tempo de conexão, investigação, apresentação, digestão do preço. Sessões que fecham em MENOS DE 8 turnos no sub-modo caminho_completo são SUSPEITAS — ou o lead foi fácil demais (fantasia), ou o Ramon pulou passos críticos.
- Se turnos totais < 8 E outcome = venda_realizada E sub-modo = caminho_completo: no outcome_motivo, ADICIONE alerta "Sessão muito curta (N turnos) pra uma venda high-ticket realista — provável pulo de passos do Caminho (rapport, investigação, apresentação). Em chamada real, esperar 15-25 turnos". E no "por_momento.fechamento.ponto_fraco" ressalte que o aceite veio antes da validação emocional completa.`;

    const totalTurnos = turnFeedbacks.length;
    const sessaoCurta = totalTurnos < 8 && outcomeDeterministico === 'venda_realizada' && (scenario.submodo === 'caminho_completo' || !scenario.submodo);

    const user = `Persona: ${scenario.persona.nome} (${scenario.persona.idade}, ${scenario.persona.profissao})
Padrão oculto Teoria da Permissão: ${scenario.padrao_oculto_teoria_permissao}
Objeção superficial: ${scenario.objecao_superficial}
Objeção real: ${scenario.objecao_real}
Nível de conhecimento: ${scenario.nivel_conhecimento_metodologia || 'exposto'}
Sub-modo: ${scenario.submodo}

Total de turnos desta sessão: ${totalTurnos}
${sessaoCurta ? '⚠️ ALERTA: sessão muito curta pra uma venda high-ticket realista (< 8 turnos no sub-modo caminho_completo). Aplique a PENALIDADE DE SESSÃO CURTA descrita no system.' : ''}

OUTCOME (decidido pelo sistema, NÃO mude): ${outcomeDeterministico}
Motivo sistêmico: ${motivoSistemico}
${isParcial ? 'ATENÇÃO: é um RELATÓRIO PARCIAL. Não puxe conclusão de "não vendeu" como falha — o Ramon encerrou de propósito. Analise SÓ o que foi feito e aponte o gap técnico até o fechamento.' : ''}

Passos do Caminho cumpridos: ${JSON.stringify(passosCumpridos)} (${coberturaPct}% de cobertura)
Notas médias por dimensão: ${JSON.stringify(notas)}
Nota final: ${nota_final.toFixed(2)}

Técnicas aplicadas com frequência: ${JSON.stringify(tecAcc)}

Armadilhas cometidas ao longo da sessão: ${JSON.stringify(armadilhasCometidas)}

Feedbacks turno-a-turno (últimos ${Math.min(n, 12)}):
${turnFeedbacks.slice(-12).map((f, i) => `Turno ${turnFeedbacks.length - 12 + i + 1} | passo:${f.passo_do_caminho_executado || '-'} | nota:${f.nota_geral || '-'} | forte:"${(f.ponto_forte || '').slice(0, 60)}" | ajuste:"${(f.ajuste || '').slice(0, 80)}"${f.armadilha_cometida ? ' | ARMADILHA:' + f.armadilha_cometida : ''}`).join('\n')}

Últimas 6 trocas:
${conversation.slice(-6).map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content.slice(0, 200)}`).join('\n')}

Devolva JSON estrito, sem markdown:
{
  "frase_caderno": "frase cirúrgica 10-22 palavras",
  "outcome_motivo": "por que deu / não deu venda, em 1-2 frases concretas citando passos ou falas específicas",
  "outcome_evidencia_lead": "citação textual da fala do lead que confirma o outcome (ou null se não houve sinal claro)",
  "melhores_3_tecnicas": [
    { "nome": "Mirror", "momento": "abertura|conducao|fechamento", "turno": N, "porque": "frase curta do impacto real na sessão, citando o que aconteceu" },
    { "nome": "...", "momento": "...", "turno": N, "porque": "..." },
    { "nome": "...", "momento": "...", "turno": N, "porque": "..." }
  ],
  "piores_3_pontos": [
    { "tipo": "armadilha|tecnica_faltante|tecnica_mal_aplicada", "nome": "nome da técnica ou armadilha", "momento": "abertura|conducao|fechamento", "turno": N, "o_que_aconteceu": "descrição concreta", "correcao": "o que o Ramon deveria ter feito" },
    { "tipo": "...", "nome": "...", "momento": "...", "turno": N, "o_que_aconteceu": "...", "correcao": "..." },
    { "tipo": "...", "nome": "...", "momento": "...", "turno": N, "o_que_aconteceu": "...", "correcao": "..." }
  ],
  "por_momento": {
    "abertura": { "nota": 0-10, "ponto_forte": "...", "ponto_fraco": "...", "sugestao": "..." },
    "conducao": { "nota": 0-10, "ponto_forte": "...", "ponto_fraco": "...", "sugestao": "..." },
    "fechamento": { "nota": 0-10, "ponto_forte": "...", "ponto_fraco": "...", "sugestao": "..." }
  }
}

Se algum MOMENTO não foi alcançado na sessão (ex: não chegou em Fechamento), ainda assim devolva com nota baixa e explique "não foi alcançado" no ponto_fraco, e a sugestão de como chegar lá.
Se não houver 3 técnicas boas suficientes, repita a lista ou marque "parcialmente aplicada".
Se não houver 3 pontos ruins, use oportunidades de evolução no lugar.`;

    let extra = {};
    try {
      const { text } = await ClaudeAPI.call({
        system, messages: [{ role: 'user', content: user }],
        max_tokens: 1800, temperature: 0.5
      });
      const parsed = ClaudeAPI.extractJSON(text);
      if (parsed) extra = parsed;
    } catch (err) {
      console.warn('finalReport LLM falhou:', err);
    }

    const fallbackMotivo = {
      'venda_realizada': 'Lead sinalizou aceite + compromisso de pagamento ao fim.',
      'venda_nao_realizada_desistencia': 'Lead recusou explicitamente. Não comprou.',
      'encerrada_parcial': 'Sessão encerrada pelo Ramon antes do fechamento. Relatório parcial.',
      'venda_nao_realizada_tempo': 'Bateu o teto de turnos sem fechamento.',
      'venda_nao_realizada': 'Sessão encerrou sem o lead fechar.'
    };

    // ===== CONSISTÊNCIA DE NOTAS =====
    // A nota final média das dimensões não pode ser maior que o PIOR MOMENTO que o
    // LLM identificou. Se o momento Fechamento deu 8.0 mas a média dimensional tá
    // 10.0, algo está errado — as dimensões não capturaram o que o momento viu.
    // Cap: nota_final <= min(por_momento) + 0.5 de tolerância.
    const porMomento = extra.por_momento || {};
    const notasPorMomento = [
      typeof porMomento?.abertura?.nota === 'number' ? porMomento.abertura.nota : null,
      typeof porMomento?.conducao?.nota === 'number' ? porMomento.conducao.nota : null,
      typeof porMomento?.fechamento?.nota === 'number' ? porMomento.fechamento.nota : null
    ].filter(x => x !== null && x > 0);

    let notaFinalAjustada = nota_final;
    let notasAjustadas = { ...notas };
    let consistenciaMotivo = null;

    if (notasPorMomento.length > 0) {
      const piorMomento = Math.min(...notasPorMomento);
      const capPorMomento = Math.min(10, piorMomento + 0.5);
      if (notaFinalAjustada > capPorMomento) {
        consistenciaMotivo = `nota final ajustada de ${notaFinalAjustada.toFixed(2)} para ${capPorMomento.toFixed(2)} (cap pelo pior momento ${piorMomento.toFixed(1)})`;
        notaFinalAjustada = capPorMomento;
      }
      // E se alguma dimensão está MUITO acima do pior momento, ajusta ela também
      ['escuta', 'investigacao', 'apresentacao', 'fechamento', 'fidelidade'].forEach(k => {
        if ((notasAjustadas[k] || 0) > piorMomento + 1.5) {
          notasAjustadas[k] = Math.max(piorMomento + 0.5, 0);
        }
      });
    }

    // Penalidade adicional: cobertura MUITO baixa do Caminho (venda fantasma)
    // CALIBRAÇÃO (ajuste pós-sessão Leonardo):
    //   Sessão de 13 turnos com 7 passos únicos cobertura=39% é chamada REAL e boa.
    //   Ramon repete Looping/Label várias vezes (correto) mas o contador só pega únicos.
    //   Threshold antigo de 50% penalizava vendas legítimas. Novo threshold: 30% (venda fantasma).
    //   Fórmula relaxada: 7 + (pct/12). 20%=8.67, 25%=9.08, 29%=9.42 (cap leve), 30%+=sem cap.
    //   Pra sub-modos curtos (duvidas, quebra, fechamento) mantemos sem cap.
    if (outcomeDeterministico === 'venda_realizada' && coberturaPct < 30 && (scenario.submodo === 'caminho_completo' || !scenario.submodo)) {
      const capCobertura = 7 + (coberturaPct / 12);
      if (notaFinalAjustada > capCobertura) {
        const anterior = notaFinalAjustada;
        notaFinalAjustada = capCobertura;
        consistenciaMotivo = (consistenciaMotivo ? consistenciaMotivo + '; ' : '') +
          `cobertura do Caminho muito baixa ${coberturaPct}% (${passosCumpridos.length}/18) — cap ${anterior.toFixed(2)} → ${capCobertura.toFixed(2)}`;
      }
    }

    if (consistenciaMotivo) {
      console.log('[finalReport] consistência de notas:', consistenciaMotivo);
    }

    return {
      nota_final: notaFinalAjustada,
      notas: notasAjustadas,
      nota_final_raw: nota_final,       // pra debug/transparência
      consistencia_motivo: consistenciaMotivo,
      tecnicas_acumuladas: tecAcc,
      passos_cumpridos: passosCumpridos,
      cobertura_pct: coberturaPct,
      frase_caderno: extra.frase_caderno || 'Perceber sem decidir é se iludir.',
      outcome: outcomeDeterministico,
      is_parcial: isParcial,
      outcome_motivo: extra.outcome_motivo || fallbackMotivo[outcomeDeterministico] || fallbackMotivo['venda_nao_realizada'],
      outcome_evidencia_lead: extra.outcome_evidencia_lead || null,
      melhores_3_tecnicas: extra.melhores_3_tecnicas || [],
      piores_3_pontos: extra.piores_3_pontos || [],
      por_momento: extra.por_momento || {
        abertura: { nota: 0, ponto_forte: '—', ponto_fraco: '—', sugestao: '—' },
        conducao: { nota: 0, ponto_forte: '—', ponto_fraco: '—', sugestao: '—' },
        fechamento: { nota: 0, ponto_forte: '—', ponto_fraco: '—', sugestao: '—' }
      }
    };
  }

  return { evaluateTurn, leadHint, leadResponse, finalReport };
})();

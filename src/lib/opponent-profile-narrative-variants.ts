/**
 * Textos tácticos com a mesma ideia do guia, em variantes por:
 * - posição na tabela (topo / meio / fundo)
 * - adversário em casa vs fora (secção "antecipamos")
 * Placeholders: {{rank}}, {{total}}, {{g}}, {{gc}}
 */

export type RankBucket = "top" | "mid" | "bottom" | "unknown";

export type OppVenueKey = "home" | "away";

/** Onde o adversário disputa este jogo: em casa deles ou fora. */
export type ExpectVenue = OppVenueKey;

const T = (s: string) => s;

/** Piscinas grandes por arquétipo × posição — "O que propomos fazer" (abordagem). */
export const APPROACH_BY_ARCH: Record<string, Record<RankBucket, string[]>> = {
  table_top: {
    top: [
      T("Frente a quem está no {{rank}} lugar entre {{total}} equipas, o desafio é negar conforto: bloco curto sem bola, eixo tapado e transições escolhidas quando recuperares."),
      T("Classificado no {{rank}} posto: sabem decidir jogos apertados. Exige concentração total nos minutos finais e pouca folga nas marcações nas áreas."),
      T("Equipa do grupo dos primeiros cinco: circulação paciente com bola, mudanças de ritmo e pouca precipitação; sem bola, não deixes o meio virar corredor."),
      T("Referência na parte alta ({{rank}}): mesmo sem dominar o relógio, encontram golos. Mantém o empate psicológico e força-os a arriscar mais do que querem."),
      T("Adversário no {{rank}} lugar: qualidade para castigar o primeiro deslize. Linha de pressão só quando estiveres compacto por trás; caso contrário, recua e fecha."),
      T("Perfil de candidato ao título ({{rank}} de {{total}}): duelos individuais exigentes — duplica apoios nas costas e fecha o corredor central nas transições."),
      T("Topo de tabela no {{rank}}: procura impor o seu ritmo; responde com organização, saída limpa e velocidade só quando há vantagem numérica."),
      T("Equipa que vive no grupo da frente: não regales bolas na medialuna; força remates de média-longa e disputa cada segunda bola."),
    ],
    mid: [
      T("Apesar do lugar {{rank}} na tabela, há sinais de equipa de referência — trata o duelo com o rigor de um jogo contra o topo: poucos erros e decisões claras."),
      T("No {{rank}} posto, ainda competem com aspirantes ao título: fecha o meio, controla o jogo interior e não abras o campo sem necessidade."),
      T("Classificação {{rank}}: exige respeito táctico máximo, como se fossem do grupo da frente."),
    ],
    bottom: [
      T("Mesmo no {{rank}} lugar, equipas que já estiveram no topo podem mostrar soluções de equipa grande — não baixes a guarda."),
      T("Posição {{rank}}: contexto de pressão pode gerar pragmatismo extremo; atenção ao jogo directo e à bola parada."),
    ],
    unknown: [
      T("Equipa de topo de tabela: disciplina sem bola, paciência com bola e transições bem escolhidas."),
      T("Referência na classificação: fecha espaços entrelinhas e evita o jogo de ida-e-volta cedo no encontro."),
    ],
  },
  attacking: {
    top: [
      T("Entre os mais goleadores e no {{rank}} lugar: volume ofensivo elevado. Cobre as costas, fecha o meio e atrasa o jogo aberto nos primeiros minutos."),
      T("Ataque forte nos dados agregados ({{rank}}): prepara resposta à pressão e às subidas de laterais; defende as transições em 2–3 passos."),
      T("Perfil goleador no {{rank}} posto: força remates contidos, bloqueia linhas de passe para a área e evita o 1c1 na última linha."),
      T("Equipa que marca muito e está {{rank}}: o espaço aparece atrás — escolhe bem o momento de verticalizar."),
      T("GM altos na tabela e lugar {{rank}}: mantém linha defensiva equilibrada e não abras sem ter superioridade no meio."),
      T("Ofensivamente perigosos ({{rank}}): alterna bloco médio com saltos de pressão para não lhes dar ritmo constante."),
    ],
    mid: [
      T("No {{rank}} lugar, mas com números de finalização acima da média: trata o bloqueio do meio como prioridade e controla as segundas bolas na grande área."),
      T("Classificação média ({{rank}}) com perfil goleador: podem ser irregulares mas explodem em momentos — seriedade nos duelos e nas bolas paradas."),
      T("Entre equipas de meio ({{rank}}) com GM elevados: não deixes o jogo virar basquetebol; impõe pausa e largura."),
      T("{{rank}} com ataque de volume: força-os a rematar de zonas menos favoráveis e fecha o corredor central."),
      T("Posição {{rank}} com linha ofensiva forte: duplica apoios nas subidas e cobre o homem do último passe."),
      T("Meio da tabela ({{rank}}) mas goleador: o risco vem da transição — equilíbrio ao perder bola."),
    ],
    bottom: [
      T("No {{rank}} lugar, ainda assim entre os que mais marcam: desespero e ambição podem abrir o jogo — atenção aos espelhos e ao contra-ataque."),
      T("Parte baixa ({{rank}}) com GM elevados: partidas emocionais, muitos lances de segunda jogada — domina o jogo aéreo e a primeira bola."),
      T("Classificação {{rank}} com remate frequente: podem trocar prudência por volume — fecha o jogo interior e castiga erros."),
    ],
    unknown: [
      T("Perfil ofensivo nos totais da tabela: organização defensiva, coberturas e controlo do espaço entrelinhas."),
      T("Equipa com volume goleador: fecha o meio e escolhe quando acelerar."),
    ],
  },
  mid_balanced: {
    top: [
      T("No {{rank}} lugar, com leitura equilibrada: competem em quase todos os registos. Ganha duelos, segundas bolas e troca o jogo para deslocar o bloco."),
    ],
    mid: [
      T("No {{rank}} entre {{total}} equipas, perfil típico de meio: organização, pouca folga e jogo disputado aos detalhes — personalidade e claridade no último passe."),
      T("Classificação intermédia ({{rank}}): não costumam dar de graça; força-os a jogar de lado e procura superioridade numérica nas alas."),
      T("Meio da tabela no {{rank}} posto: ritmo competitivo, duelos intensos — domina o jogo de transição e evita erros na saída."),
      T("{{rank}} lugar, equilíbrio ofensivo/defensivo: o resultado pode decidir-se em bola parada ou num lance de segunda jogada."),
      T("Posição {{rank}}: equipa incómoda, pouco previsível — varia o timing da pressão e a profundidade da linha."),
      T("Entre o pelotão central ({{rank}}): convém impor o teu modelo cedo e gerir o resultado sem pânico."),
    ],
    bottom: [
      T("No {{rank}} lugar, mas ainda com registo equilibrado em campo: podem alternar pragmatismo com arriscar no momento certo."),
      T("Parte baixa ({{rank}}) com leitura de meio-tabela: atenção ao jogo emocional e aos lances de bola parada."),
    ],
    unknown: [
      T("Perfil equilibrado: impõe ritmo, ganha duelos e procura largura para desorganizar o bloco."),
    ],
  },
  defensive_block: {
    top: [
      T("No {{rank}} lugar e entre as defesas mais sólidas: paciência com bola, largura e circulação até aparecer linha de passe; depois de perder, equilíbrio imediato."),
      T("Topo ({{rank}}) com poucos GS: não te precipites — força o desgaste, procura o último passe e valoriza o remate de segunda vaga."),
      T("Classificação alta ({{rank}}) com bloco curto: dominam o espaço entrelinhas — abre o jogo e evita o passe óbvio ao eixo."),
    ],
    mid: [
      T("No {{rank}}, com poucos golos sofridos na tabela: espera bloco baixo, ritmo lento e poucas oportunidades claras — paciência e remates com critério."),
      T("Meio da tabela ({{rank}}) e defesa forte nos números: convence-os a sair e castiga transições mal defendidas."),
      T("{{rank}} lugar, GS baixos: muita bola parada e cruzamentos — trabalha o timing dos desmarques na área."),
      T("Posição {{rank}} com defesa organizada: alterna circulação lenta com acelerações pontuais para deslocar o bloco."),
      T("Entre os melhores em GS ({{rank}} na geral): não abras largura sem ter superioridade no ressalto."),
    ],
    bottom: [
      T("No {{rank}} lugar, mas defesa sólida nos totais: podem trocar iniciativa por segurança — atenção ao jogo directo e aos lançamentos."),
      T("Parte baixa ({{rank}}) com poucos GS: bloco muito fechado e pouco espaço — procura o desequilíbrio nas costas dos médios."),
    ],
    unknown: [
      T("Defesa forte nos números agregados: largura, paciência e equilíbrio após perdas."),
    ],
  },
  table_bottom: {
    top: [
      T("Mesmo no {{rank}} lugar, se os pontos não acompanham, há urgência escondida — não subestimes a agressividade em lances parados."),
    ],
    mid: [
      T("No {{rank}}, contexto de tabela difícil: emoção alta e vontade de reagir — simplicidade com bola e transições defendidas."),
    ],
    bottom: [
      T("Entre os últimos lugares ({{rank}} de {{total}}): urgência, entrega e muito duelo — evita confusão emocional e não regales transições baratas."),
      T("Parte baixa da tabela no {{rank}} posto: cada lance pesa — mantém cabeça fria e força-os a jogar com pressa."),
      T("Classificação {{rank}}: procuram o golo que desbloqueia o jogo — fecha o corredor central e domina o jogo aéreo."),
      T("{{rank}} lugar com poucos pontos: podem fechar ou arriscar cedo — lê o arranque e ajusta ao intervalo."),
      T("Zona de descida ({{rank}}): intensidade e segunda bola decisivas — ganha o meio-campo nos duelos."),
      T("Últimos lugares ({{rank}} de {{total}}): procura soluções simples, poucos toques na zona perigosa e segurança ao perder bola."),
    ],
    unknown: [
      T("Equipa com poucos pontos na tabela: intensidade, simplicidade e controlo emocional."),
    ],
  },
  physical_direct: {
    top: [
      T("No {{rank}} lugar com jogo físico e GM/GS próximos: ganha primeira e segunda bola, evita faltas laterais perigosas e faz a bola correr no chão."),
    ],
    mid: [
      T("No {{rank}}, perfil físico/directo: duelos, segundas bolas e pouco espaço entre linhas — protege o jogo interior e acelera nas transições."),
      T("Meio da tabela ({{rank}}) com contacto constante: antecipa o jogo partido e fecha o ressalto na grande área."),
      T("{{rank}} lugar, GM e GS moderados e próximos: convém verticalidade controlada e apoios curtos para sair da pressão."),
      T("Posição {{rank}} com leitura de jogo directo: cuidado com bolas longas e cruzamentos com muitos corpos na área."),
    ],
    bottom: [
      T("No {{rank}}, jogo físico por necessidade: muito duelo e pouca margem — ganha o meio e evita o jogo confuso."),
    ],
    unknown: [
      T("Perfil físico e directo: domina segundas bolas e fecha o espaço entrelinhas."),
    ],
  },
  technical_possession: {
    top: [
      T("No {{rank}}, com saldo/DG muito positivo: fecha o corredor central, pressiona em janelas curtas e ataca espaço na recuperação com poucos toques."),
      T("Topo ({{rank}}) e leitura técnica elevada: não entres na rodação sem pressão coordenada — força o passe lateral ou o remate de fora."),
    ],
    mid: [
      T("No {{rank}}, DG elevado: gostam de circular e atrair pressão — fecha linhas de passe interiores e protege as costas dos laterais."),
      T("Meio da tabela ({{rank}}) com jogo técnico: dominam o ritmo se lhes deres tempo — varia a intensidade da pressão."),
      T("{{rank}} lugar, saldo ofensivo forte: cuidado com o meio-alto e com o último passe entrelinhas."),
      T("Posição {{rank}} com posse eficiente: força o jogo para as zonas menos perigosas e recupera alto só quando estiveres compacto."),
    ],
    bottom: [
      T("No {{rank}}, ainda com DG positivo nos dados: qualidade para circular mesmo sob pressão — não abras o meio sem coberturas."),
    ],
    unknown: [
      T("Perfil técnico com saldo positivo: corredor central fechado e transições rápidas na recuperação."),
    ],
  },
};

/** "O que antecipamos do adversário" — adversário em casa vs fora × posição. */
export const EXPECT_BY_ARCH: Record<
  string,
  Record<ExpectVenue, Record<RankBucket, string[]>>
> = {
  table_top: {
    home: {
      top: [
        T("Quando joga em casa, assume ambição de equipa grande: procura o primeiro golo, sobe a pressão no arranque e usa o apoio para controlar o ritmo."),
        T("No seu estádio, equipa do {{rank}} lugar: entrada intensa, linha alta em momentos e capacidade de castigar o primeiro erro."),
        T("Em casa deles ({{rank}}): querem impor o jogo, fechar o meio e forçar erros na saída adversária."),
        T("No reduto, posição {{rank}}: procura domínio posicional, apoios junto da área e finalizações após combinações curtas."),
        T("Com o seu público, equipa de topo ({{rank}}): ritmo alto nos primeiros minutos e transições curtas para chegar à finalização."),
        T("Em casa, {{rank}} na tabela: pressão alta selectiva e muitos jogadores a aparecerem na última linha de passe."),
        T("No próprio terreno ({{rank}}): procura cruzamentos e jogadores no segundo poste; atenção ao tiro de média após recorte."),
        T("Equipa de referência em casa: quer o comando do jogo e o golo que acalma o relógio emocional."),
      ],
      mid: [
        T("Em casa, apesar do {{rank}} lugar, comportam-se como candidatos: procuram o golo cedo e o domínio nas segundas bolas."),
        T("No estádio, {{rank}}: apoio forte e vontade de subir linhas no primeiro terço do campo."),
      ],
      bottom: [
        T("Mesmo em situação de tabela difícil, em casa o {{rank}} pode subir a intensidade — não surpreendas com o arranque."),
      ],
      unknown: [
        T("Em casa, equipa de topo: procura comando, pressão e finalização."),
      ],
    },
    away: {
      top: [
        T("Fora de casa, equipa do {{rank}} lugar costuma ser mais pragmática: menos exposição, gestão do resultado e transições escolhidas."),
        T("Em deslocação, {{rank}}: fecha um pouco mais cedo, aceita menos risco e valoriza bolas paradas e lances de experiência."),
        T("Fora, posição {{rank}}: menos gente fixa no último terço, mas qualidade para decidir em poucas oportunidades."),
        T("Visitante de topo ({{rank}}): procura controlar o meio, adiar o jogo aberto e explorar erros na transição."),
        T("Na condição de visitante, {{rank}}: discurso de gestão emocional — não se desorganizam facilmente após o golo sofrido."),
        T("Fora, equipa de referência ({{rank}}): linha de médios compacta e salto de pressão em zonas escolhidas."),
        T("Em deslocação, {{rank}}: menos pressão alta contínua, mais equilíbrio e transição rápida quando recuperam."),
        T("Visitante do grupo da frente ({{rank}}): atenção ao contra-ataque bem ensaiado e ao último passe na profundidade."),
      ],
      mid: [
        T("Fora, mesmo {{rank}}, mantêm leitura de equipa grande: menos iniciativa, mais paciência."),
      ],
      bottom: [
        T("Fora, {{rank}}: podem fechar ainda mais e apostar num lance isolado — não abras sem controlo."),
      ],
      unknown: [
        T("Fora, equipa de topo: pragmatismo, menos exposição e transições certeiras."),
      ],
    },
  },
  attacking: {
    home: {
      top: [
        T("Quando joga em casa, assume uma postura atacante: procura recuperar alto desde o início e coloca várias unidades perto da baliza adversária."),
        T("No seu estádio, equipa muito goleadora ({{rank}}): linha ofensiva subida, apoios interiores e finalizações após pressão alta."),
        T("Em casa deles, {{rank}} lugar entre goleadores: ritmo forte, muitos jogadores na última linha e cruzamentos repetidos."),
        T("No reduto, posição {{rank}} com GM elevados: querem o jogo aberto e o duelo constante na área adversária."),
        T("Em casa, perfil ofensivo ({{rank}}): saltos de pressão e recuperações na zona alta para marcar cedo."),
        T("Com o público a empurrar, {{rank}}: procura dominar o último terço e criar volume de remate."),
        T("No {{rank}}, em casa: entra com agressividade na primeira bola e procura fixar defesas com movimentos interiores."),
        T("Equipa goleadora em casa ({{rank}}): atenção aos desmarques entrelinhas e aos remates de primeira após cruzamento."),
      ],
      mid: [
        T("Em casa, {{rank}} mas entre os que mais marcam: querem o comando e o golo que desbloqueia — força-os a rematar de zonas más."),
        T("No estádio, lugar {{rank}} com ataque forte: pressão e apoios, mas às vezes espaço nas costas ao perder bola."),
        T("Em casa deles ({{rank}}): procura largura e interiors a aparecer na área; fecha as linhas de passe para o último terço."),
        T("{{rank}} em casa, perfil ofensivo: jogo intenso na recuperação alta em momentos alternados."),
      ],
      bottom: [
        T("Em casa, {{rank}} na geral mas com volume goleador: desespero pode virar volume ofensivo — fecha o corredor e castiga na transição."),
        T("No reduto, parte baixa ({{rank}}) com GM altos: emoção e remates frequentes, atenção à segunda bola."),
      ],
      unknown: [
        T("Em casa, equipa ofensiva: pressão, apoios na área e jogo aberto."),
      ],
    },
    away: {
      top: [
        T("Fora, equipa goleadora no {{rank}} lugar: continua perigosa, mas costuma deixar mais espaço atrás — prepara transições e costas dos laterais."),
        T("Em deslocação, {{rank}} entre os que mais marcam: volume ofensivo com menos fixação no último terço, mais rupturas longas."),
        T("Visitante ofensivo ({{rank}}): procura transição rápida e poucos toques na profundidade."),
        T("Fora, posição {{rank}}: alterna bloco médio com acelerações; atenção aos cruzamentos em velocidade."),
        T("Na condição de visitante, {{rank}}: menos pressão alta contínua, mais procura de espaço entrelinhas na transição."),
        T("Fora de casa, {{rank}} com GM elevados: ainda assim arriscam na última linha — fecha o ressalto."),
        T("Equipa goleadora em deslocação ({{rank}}): cuidado com o 2c2 e com o passe vertical após recuperação."),
        T("Visitante {{rank}}: querem marcar cedo para gerir — não regales espaço na primeira meia hora."),
      ],
      mid: [
        T("Fora, {{rank}} com perfil ofensivo: menos gente na área fixa, mais chegadas em diagonal."),
        T("Em deslocação, lugar {{rank}}: procuram o golo em lances de insistência e bolas paradas."),
      ],
      bottom: [
        T("Fora, {{rank}} mas goleador: podem trocar prudência por um plano directo — atenção ao jogo longo."),
      ],
      unknown: [
        T("Fora, equipa ofensiva: transições, espaço nas costas e remates rápidos."),
      ],
    },
  },
  mid_balanced: {
    home: {
      top: [
        T("Em casa, equipa do {{rank}} lugar: quer impor ritmo e tirar partido do apoio, com duelos intensos na primeira bola."),
      ],
      mid: [
        T("No seu estádio, {{rank}} entre {{total}}: procura ser incómoda, fechar o meio e ganhar o duelo psicológico no primeiro quarto de hora."),
        T("Em casa deles, lugar {{rank}}: mistura de pressão e organização — não são previsíveis no último passe."),
        T("Em casa, posição {{rank}}: apoio forte e vontade de subir a linha defensiva em momentos pontuais."),
        T("No reduto, {{rank}}: procura dominar as segundas bolas e forçar erros com intensidade."),
        T("Equipa de meio em casa ({{rank}}): quer o resultado sem abdicar completamente do risco."),
        T("Em casa, {{rank}}: alterna bloco médio com saltos de pressão; lê bem o momento de acelerar."),
      ],
      bottom: [
        T("Em casa, {{rank}}: emoção alta e vontade de reagir — duelos agressivos na primeira bola."),
      ],
      unknown: [
        T("Em casa, equipa equilibrada: intensidade, duelos e organização."),
      ],
    },
    away: {
      top: [
        T("Fora, {{rank}} com leitura equilibrada: mais cautela, menos exposição e dependência do erro adversário."),
      ],
      mid: [
        T("Em deslocação, {{rank}}: fecha um pouco mais cedo, gere o resultado e procura o erro com paciência."),
        T("Fora de casa, lugar {{rank}}: bloco mais baixo e transição rápida quando recupera."),
        T("Visitante no {{rank}}: menos iniciativa, mais transições escolhidas e bola parada."),
        T("Fora, posição {{rank}}: procura não dar o jogo por ganho e explorar lances de insistência."),
        T("Na condição de visitante, {{rank}}: compactação e poucas folgas entre linhas."),
        T("Fora, equipa de meio ({{rank}}): atenção ao jogo directo e aos lançamentos longos."),
      ],
      bottom: [
        T("Fora, {{rank}}: pragmatismo extremo e pouca exposição — um ponto importa."),
      ],
      unknown: [
        T("Fora, equipa equilibrada: cautela, bloco fechado e transição."),
      ],
    },
  },
  defensive_block: {
    home: {
      top: [
        T("Em casa, {{rank}} com defesa sólida: linhas juntas, pouco espaço e muita bola parada ofensiva."),
      ],
      mid: [
        T("No seu estádio, {{rank}} entre defesas fortes: bloco baixo, ritmo lento e poucas oportunidades — força o desgaste."),
        T("Em casa deles, lugar {{rank}}: priorizam não sofrer e esperar o momento de transição ou bola parada."),
        T("Em casa, posição {{rank}} com poucos GS: pouca folga na última linha e muita gente na zona central."),
        T("No reduto, {{rank}}: cruzamentos e segunda vaga, com poucos espaços entrelinhas."),
        T("Equipa defensiva em casa ({{rank}}): querem o jogo partido e o resultado apertado."),
        T("Em casa, {{rank}}: gestão do tempo e do resultado parcial — pouca pressão alta contínua."),
      ],
      bottom: [
        T("Em casa, {{rank}}: bloco ainda mais fechado — um golo pode mudar tudo."),
      ],
      unknown: [
        T("Em casa, bloco baixo: linhas juntas, bola parada e transição."),
      ],
    },
    away: {
      top: [
        T("Fora, {{rank}} com defesa forte: ainda mais fechados e pouca exposição — um ponto já pode ser vitória."),
      ],
      mid: [
        T("Em deslocação, {{rank}} com poucos GS: linhas muito próximas, ritmo lento e poucas finalizações concedidas."),
        T("Fora de casa, lugar {{rank}}: bloco extremamente compacto e atenção ao relógio."),
        T("Visitante {{rank}}, perfil defensivo: procura 0x0 ou 1x0 com lance isolado."),
        T("Fora, posição {{rank}}: pouca gente no último terço ofensivo fixo; mais transição longa."),
        T("Na condição de visitante, {{rank}}: satisfação com empate e jogo de poucas oportunidades."),
        T("Fora, equipa de bloco baixo ({{rank}}): força erros com pressão média e recuperações na zona intermediária."),
      ],
      bottom: [
        T("Fora, {{rank}} na parte baixa: pragmatismo extremo e jogo directo."),
      ],
      unknown: [
        T("Fora, bloco defensivo: linhas juntas e ritmo lento."),
      ],
    },
  },
  table_bottom: {
    home: {
      top: [
        T("Em casa, {{rank}} com urgência de pontos: entrada agressiva e muito duelo."),
      ],
      mid: [
        T("No seu estádio, {{rank}}: emoção alta e vontade de levantar o público com o primeiro lance."),
      ],
      bottom: [
        T("Em casa, {{rank}} entre os últimos: tudo ou nada no primeiro quarto de hora — muito duelo e bola longa."),
        T("No reduto, lugar {{rank}}: procuram o golo que desbloqueia a pressão; atenção ao jogo emocional."),
        T("Em casa deles, posição {{rank}}: intensidade máxima e segunda bola na grande área."),
        T("Equipa em luta em casa ({{rank}}): remates de qualquer zona e cruzamentos repetidos."),
        T("Em casa, {{rank}}: querem o apoio a peso e o golo que muda o rumo."),
        T("No estádio, {{rank}}: arranque forte e vontade de marcar cedo a todo o custo."),
      ],
      unknown: [
        T("Em casa, equipa em dificuldade: urgência e duelos."),
      ],
    },
    away: {
      top: [
        T("Fora, {{rank}} em situação delicada: pragmatismo, bloco baixo e pouca exposição."),
      ],
      mid: [
        T("Em deslocação, {{rank}}: jogo directo e poucas iniciativas — procura o erro."),
      ],
      bottom: [
        T("Fora de casa, {{rank}} entre os últimos: bloco baixo, jogo directo e aposta no pouco que precisam."),
        T("Na condição de visitante, lugar {{rank}}: fecham cedo e exploram bola parada ou transição."),
        T("Fora, posição {{rank}}: pouca folga atrás; cada lance defensivo é prioridade."),
        T("Visitante em dificuldade ({{rank}}): empate é ouro — poucas subidas simultâneas."),
        T("Em deslocação, {{rank}}: gestão emocional e tempo morto quando necessário."),
        T("Fora, {{rank}}: procuram não perder primeiro e crescer se o resultado permitir."),
      ],
      unknown: [
        T("Fora, equipa em dificuldade: pragmatismo e bloco fechado."),
      ],
    },
  },
  physical_direct: {
    home: {
      top: [
        T("Em casa, {{rank}} com jogo físico: bola longa, segunda bola e muitos corpos na área."),
      ],
      mid: [
        T("No seu estádio, {{rank}}: contacto constante, duelos e cruzamentos com gente na grande área."),
        T("Em casa deles, lugar {{rank}}: procura impor o físico desde o início e ganhar o meio-campo na força."),
        T("Em casa, posição {{rank}}: jogo directo e poucas combinações longas — atenção à segunda vaga."),
        T("No reduto, {{rank}}: intensidade na primeira bola e lançamentos para correr por fora."),
      ],
      bottom: [
        T("Em casa, {{rank}}: físico e urgência — cada duelo pesa."),
      ],
      unknown: [
        T("Em casa, jogo físico: segundas bolas e contacto."),
      ],
    },
    away: {
      top: [
        T("Fora, {{rank}} com perfil físico: menos corredor para segunda bola longa, mas contacto igual."),
      ],
      mid: [
        T("Em deslocação, {{rank}}: continuam fortes no duelo — atenção às segundas bolas e aos lances parados."),
        T("Fora de casa, lugar {{rank}}: jogo mais directo e menos combinações, mais bola por cima."),
        T("Visitante {{rank}}, físico: procura isolar duelos nas alas e ganhar o meio na força."),
        T("Fora, posição {{rank}}: menos subidas em bloco, mais lançamentos e segunda bola."),
      ],
      bottom: [
        T("Fora, {{rank}}: físico por necessidade — pouca margem para erro."),
      ],
      unknown: [
        T("Fora, jogo físico: duelos e bolas longas."),
      ],
    },
  },
  technical_possession: {
    home: {
      top: [
        T("Em casa, {{rank}} com DG elevado: circulação, atração de pressão e linha entrelinhas bem ocupada."),
      ],
      mid: [
        T("No seu estádio, {{rank}}: querem tempo de bola, domínio posicional e último passe interior."),
        T("Em casa deles, lugar {{rank}}: meio-alto perigoso e mudanças de orientação para deslocar o bloco."),
        T("Em casa, posição {{rank}}: procura controlar o ritmo e forçar o adversário a correr."),
        T("No reduto, {{rank}}: combinações curtas e apoios no corredor central."),
        T("Equipa técnica em casa ({{rank}}): pouca pressão alta contínua, mais circulação e desequilíbrios no último terço."),
        T("Em casa, {{rank}}: leitura de jogo acima da média — fecha linhas de passe interiores."),
      ],
      bottom: [
        T("Em casa, {{rank}}: qualidade para circular mesmo sob pressão."),
      ],
      unknown: [
        T("Em casa, equipa técnica: posse e entrelinhas."),
      ],
    },
    away: {
      top: [
        T("Fora, {{rank}} com DG forte: menos tempo com bola, mais transições longas e espaços interiores em velocidade."),
      ],
      mid: [
        T("Em deslocação, {{rank}}: circulação ainda boa, mas menos fixação no último terço."),
        T("Fora de casa, lugar {{rank}}: procura domínio em zonas intermediárias e último passe na profundidade."),
        T("Visitante técnico ({{rank}}): menos jogadores na área fixa, mais rupturas de interior."),
        T("Fora, posição {{rank}}: alterna posse longa com acelerações pontuais."),
        T("Na condição de visitante, {{rank}}: atenção ao meio-alto e ao terceiro homem."),
        T("Fora, {{rank}}: querem o comando mesmo longe — pressão média e salto em zona escolhida."),
      ],
      bottom: [
        T("Fora, {{rank}}: ainda assim procuram circular — não dês tempo."),
      ],
      unknown: [
        T("Fora, equipa técnica: transições e entrelinhas."),
      ],
    },
  },
};

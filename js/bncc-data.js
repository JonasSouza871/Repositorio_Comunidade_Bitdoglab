/**
 * BNCC Computação - Base de códigos válidos
 * Fonte: Complemento à BNCC - Computação
 */

const BNCC_CODES = {
    // Educação Infantil
    "EI03CO01": "Reconhecer padrão de repetição em sequências",
    "EI03CO02": "Expressar etapas de uma tarefa de forma ordenada",
    "EI03CO03": "Executar algoritmos brincando com objetos",
    "EI03CO04": "Criar e representar algoritmos para resolver problemas",
    "EI03CO05": "Comparar soluções algorítmicas para um mesmo problema",
    "EI03CO06": "Compreender decisões verdadeiro/falso",
    "EI03CO07": "Reconhecer dispositivos eletrônicos e não-eletrônicos",
    "EI03CO08": "Compreender interfaces para comunicação com objetos",
    "EI03CO09": "Identificar dispositivos computacionais e formas de interação",
    "EI03CO10": "Utilizar tecnologia digital de maneira segura e respeitosa",
    "EI03CO11": "Adotar hábitos saudáveis de uso de tecnologia",

    // 1º Ano
    "EF01CO01": "Organizar objetos identificando padrões e diferenças",
    "EF01CO02": "Identificar e seguir sequências de passos do dia a dia",
    "EF01CO03": "Criar sequências de passos relacionando a algoritmos",
    "EF01CO04": "Reconhecer informação, armazenamento e transmissão",
    "EF01CO05": "Representar informação usando diferentes codificações",
    "EF01CO06": "Reconhecer e explorar artefatos computacionais",
    "EF01CO07": "Uso seguro de tecnologias para proteção de dados pessoais",

    // 2º Ano
    "EF02CO01": "Criar e comparar modelos identificando padrões",
    "EF02CO02": "Criar algoritmos com repetições simples (iterações definidas)",
    "EF02CO03": "Identificar que máquinas executam conjuntos próprios de instruções",
    "EF02CO04": "Diferenciar hardware e software",
    "EF02CO05": "Reconhecer tecnologias computacionais no cotidiano",
    "EF02CO06": "Reconhecer cuidados com segurança em dispositivos",

    // 3º Ano
    "EF03CO01": "Associar verdadeiro/falso a sentenças lógicas com negação",
    "EF03CO02": "Criar algoritmos com repetições condicionais (iterações indefinidas)",
    "EF03CO03": "Aplicar decomposição para resolver problemas complexos",
    "EF03CO04": "Relacionar conceito de informação com dado",
    "EF03CO05": "Compreender que dados são estruturados em formatos específicos",
    "EF03CO06": "Reconhecer dispositivos de entrada e saída",
    "EF03CO07": "Utilizar navegadores e ferramentas de busca",
    "EF03CO08": "Usar ferramentas computacionais para expressão digital",
    "EF03CO09": "Reconhecer impacto do compartilhamento de dados pessoais",

    // 4º Ano
    "EF04CO01": "Representar objetos através de matrizes e coordenadas",
    "EF04CO02": "Representar objetos através de registros com campos nomeados",
    "EF04CO03": "Criar algoritmos com repetições aninhadas",
    "EF04CO04": "Entender codificação digital para armazenamento e transmissão",
    "EF04CO05": "Codificar informações (binário, ASCII, RGB)",
    "EF04CO06": "Usar ferramentas computacionais para criação de conteúdo",
    "EF04CO07": "Demonstrar postura ética na coleta e uso de dados",
    "EF04CO08": "Verificar confiabilidade de fontes na Internet",

    // 5º Ano
    "EF05CO01": "Representar objetos através de listas com manipulações",
    "EF05CO02": "Representar objetos através de grafos com manipulações",
    "EF05CO03": "Operações lógicas NÃO, E e OU",
    "EF05CO04": "Criar algoritmos com seleções condicionais",
    "EF05CO05": "Identificar componentes principais de um computador",
    "EF05CO06": "Reconhecer armazenamento local ou remoto",
    "EF05CO07": "Reconhecer a necessidade de sistema operacional",
    "EF05CO08": "Acessar informações na Internet de forma crítica",
    "EF05CO09": "Usar informações respeitando direitos autorais",
    "EF05CO10": "Compreender mudanças tecnológicas no mundo do trabalho",
    "EF05CO11": "Identificar tecnologias adequadas para cada problema",

    // 6º Ano
    "EF06CO01": "Classificar informações em tipos de dados",
    "EF06CO02": "Elaborar algoritmos com linguagem de programação",
    "EF06CO03": "Descrever solução e construir programa",
    "EF06CO04": "Decompor e automatizar soluções com programação",
    "EF06CO05": "Identificar entradas e saídas de problemas",
    "EF06CO06": "Generalizar soluções com variáveis e parâmetros",
    "EF06CO07": "Entender transmissão de dados em pacotes",
    "EF06CO08": "Armazenar, manipular e compactar arquivos",
    "EF06CO09": "Conduta ética em comunicação digital",
    "EF06CO10": "Analisar consumo de tecnologia e sustentabilidade",

    // 7º Ano
    "EF07CO01": "Programar com registros e vetores",
    "EF07CO02": "Detectar e remover erros em programas (debugging)",
    "EF07CO03": "Soluções computacionais interdisciplinares",
    "EF07CO04": "Explorar propriedades básicas de grafos",
    "EF07CO05": "Decomposição e reúso com programação colaborativa",
    "EF07CO06": "Compreender protocolos de transmissão de dados",
    "EF07CO07": "Identificar problemas de segurança cibernética",
    "EF07CO08": "Demonstrar empatia sobre opiniões divergentes na web",
    "EF07CO09": "Reconhecer e debater sobre cyberbullying",
    "EF07CO10": "Identificar impactos ambientais do lixo eletrônico",
    "EF07CO11": "Criar e publicar produtos digitais colaborativamente",

    // 8º Ano
    "EF08CO01": "Resolver problemas usando recursão",
    "EF08CO02": "Programar com listas e recursão",
    "EF08CO03": "Algoritmos clássicos de ordenação e busca",
    "EF08CO04": "Soluções computacionais interdisciplinares avançadas",
    "EF08CO05": "Paralelismo, concorrência e processamento distribuído",
    "EF08CO06": "Estrutura e funcionamento da internet",
    "EF08CO07": "Compartilhar informações de forma responsável em redes sociais",
    "EF08CO08": "Distinguir tipos de dados pessoais e riscos",
    "EF08CO09": "Analisar termos de uso de plataformas",
    "EF08CO10": "Segurança e privacidade em ambientes virtuais",
    "EF08CO11": "Avaliar precisão e vieses em fontes de informação",

    // 9º Ano
    "EF09CO01": "Programar com árvores e grafos",
    "EF09CO02": "Soluções computacionais integrando todo conhecimento",
    "EF09CO03": "Modelar sistemas com autômatos e eventos",
    "EF09CO04": "Compreender malwares e ataques cibernéticos",
    "EF09CO05": "Analisar técnicas de criptografia",
    "EF09CO06": "Analisar problemas sociais e propor soluções digitais",
    "EF09CO07": "Avaliar implicações socioambientais das tecnologias",
    "EF09CO08": "Discutir desigualdade no acesso à tecnologia",
    "EF09CO09": "Criar conteúdo respeitando direitos autorais",
    "EF09CO10": "Avaliar veracidade e identificar fake news",

    // Por Etapa - 1º ao 5º Ano
    "EF15CO01": "Identificar formas de organizar informação (matrizes, listas, grafos)",
    "EF15CO02": "Construir algoritmos com sequência, seleção e repetição",
    "EF15CO03": "Operações lógicas NÃO, E, OU",
    "EF15CO04": "Decomposição de problemas complexos",
    "EF15CO05": "Codificar informação para dispositivos computacionais",
    "EF15CO06": "Conhecer componentes básicos de dispositivos",
    "EF15CO07": "Conceito de Sistema Operacional",
    "EF15CO08": "Usar tecnologias para pesquisa e resolução de problemas",
    "EF15CO09": "Uso seguro, ético e responsável de tecnologias",

    // Por Etapa - 6º ao 9º Ano
    "EF69CO01": "Classificar informações em tipos de dados",
    "EF69CO02": "Elaborar algoritmos com linguagem de programação",
    "EF69CO03": "Descrever soluções e construir programas",
    "EF69CO04": "Decomposição e automação com programação",
    "EF69CO05": "Identificar entradas e saídas com tipos de dados",
    "EF69CO06": "Generalizar soluções com variáveis",
    "EF69CO07": "Transmissão de dados em pacotes",
    "EF69CO08": "Armazenar, manipular e compactar arquivos",
    "EF69CO09": "Paralelismo e processamento distribuído",
    "EF69CO10": "Estrutura e funcionamento da internet",
    "EF69CO11": "Conduta ética em comunicação digital",
    "EF69CO12": "Consumo de tecnologia e sustentabilidade",

    // Ensino Médio
    "EM13CO01": "Reutilizar soluções existentes para novos problemas",
    "EM13CO02": "Refinamento progressivo da especificação à implementação",
    "EM13CO03": "Analisar consumo de recursos dos algoritmos (complexidade)",
    "EM13CO04": "Metaprogramação como forma de generalização",
    "EM13CO05": "Identificar limites da Computação (decidibilidade)",
    "EM13CO06": "Avaliar software por métricas e características",
    "EM13CO07": "Tecnologias, protocolos e serviços de redes",
    "EM13CO08": "Segurança e privacidade com evolução tecnológica",
    "EM13CO09": "Tecnologias digitais no mundo do trabalho",
    "EM13CO10": "Fundamentos de Inteligência Artificial",
    "EM13CO11": "Modelos computacionais e simulações",
    "EM13CO12": "Ciência de dados: produzir e analisar informações"
};

// Mapa de nível por prefixo do código
const BNCC_LEVELS = {
    "EI03": "Educação Infantil",
    "EF01": "1º Ano",
    "EF02": "2º Ano",
    "EF03": "3º Ano",
    "EF04": "4º Ano",
    "EF05": "5º Ano",
    "EF06": "6º Ano",
    "EF07": "7º Ano",
    "EF08": "8º Ano",
    "EF09": "9º Ano",
    "EF15": "1º ao 5º Ano",
    "EF69": "6º ao 9º Ano",
    "EM13": "Ensino Médio"
};

/**
 * Valida se um código BNCC existe
 */
function isValidBnccCode(code) {
    return code.toUpperCase() in BNCC_CODES;
}

/**
 * Retorna descrição de um código BNCC
 */
function getBnccDescription(code) {
    return BNCC_CODES[code.toUpperCase()] || null;
}

/**
 * Retorna o nível escolar de um código BNCC
 */
function getBnccLevel(code) {
    const prefix = code.substring(0, 4).toUpperCase();
    return BNCC_LEVELS[prefix] || '';
}

/**
 * Busca códigos BNCC por texto (código ou descrição)
 */
function searchBnccCodes(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const [code, desc] of Object.entries(BNCC_CODES)) {
        if (code.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
            results.push({ code, description: desc, level: getBnccLevel(code) });
        }
    }
    return results;
}

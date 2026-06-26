"use client";

interface MinutaProps {
  ies: {
    name: string;
    razaoSocial?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    coordenador?: string;
    cargoCoord?: string;
    email?: string;
  };
  smarter: {
    razaoSocial?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    responsavel?: string;
    email?: string;
    telefone?: string;
  };
  dataAssinatura?: Date | null;
  assinanteName?: string;
  protocolo?: string;
  modo?: "visualizacao" | "assinado"; // visualizacao = leitura antes de assinar
}

const hoje = new Date();
const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export default function MinutaConvenio({ ies, smarter, dataAssinatura, assinanteName, protocolo, modo = "visualizacao" }: MinutaProps) {
  const dataFormatada = dataAssinatura
    ? `${new Date(dataAssinatura).getDate()} de ${meses[new Date(dataAssinatura).getMonth()]} de ${new Date(dataAssinatura).getFullYear()}`
    : `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  const cnpjSmarter = smarter.cnpj || "";
  const cnpjIES = ies.cnpj || "a ser informado";

  return (
    <div className="minuta-convenio font-serif text-sm text-gray-900 leading-relaxed">
      <style>{`
        .minuta-convenio h1 { font-size: 1rem; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .minuta-convenio h2 { font-size: 0.85rem; font-weight: 700; text-align: center; text-transform: uppercase; margin-bottom: 1.5rem; color: #1e3a5f; }
        .minuta-convenio h3 { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1e3a5f; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; }
        .minuta-convenio p { margin-bottom: 0.75rem; text-align: justify; }
        .minuta-convenio .clausula { margin-top: 1rem; }
        .minuta-convenio .paragrafo { margin-left: 1.5rem; margin-top: 0.5rem; font-size: 0.8rem; }
        .minuta-convenio .assinatura-bloco { margin-top: 3rem; border-top: 2px solid #1e3a5f; padding-top: 1rem; }
        .minuta-convenio .campo { display: inline-block; min-width: 200px; border-bottom: 1px solid #374151; margin-left: 0.25rem; }
        .minuta-convenio strong { font-weight: 700; }
      `}</style>

      <h1>Convênio de Estágio</h1>
      <h2>Agente de Integração — Lei n.º 11.788/2008</h2>

      <p>
        Pelo presente instrumento particular, de um lado, na qualidade de <strong>CONCEDENTE</strong>:{" "}
        <strong>{ies.razaoSocial || ies.name}</strong>, inscrita no CNPJ sob o n.º <strong>{cnpjIES}</strong>,
        com sede em <strong>{ies.endereco || "endereço a ser informado"}</strong>,{" "}
        <strong>{ies.cidade || "—"}/{ies.uf || "—"}</strong>, neste ato representada por{" "}
        <strong>{ies.coordenador || "____________________"}</strong>,
        na qualidade de <strong>{ies.cargoCoord || "Coordenador(a)"}</strong> — doravante denominada simplesmente <strong>CONCEDENTE</strong>;
      </p>
      <p>
        E, de outro lado, na qualidade de <strong>AGENTE DE INTEGRAÇÃO</strong>:{" "}
        <strong>{smarter.razaoSocial || "SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA."}</strong>, inscrita no CNPJ
        sob o n.º <strong>{cnpjSmarter}</strong>, com sede em{" "}
        <strong>{smarter.endereco || "endereço da Smarter"}</strong>, <strong>{smarter.cidade || "—"}/{smarter.uf || "—"}</strong>,
        neste ato representada por <strong>{smarter.responsavel || "____________________"}</strong> — doravante denominada simplesmente <strong>AGENTE</strong>;
      </p>
      <p>
        Resolvem celebrar o presente Convênio de Estágio, vinculado à Lei n.º 11.788, de 25 de setembro de 2008,
        mediante as cláusulas e condições seguintes:
      </p>

      <h3>Cláusula Primeira — Do Objeto</h3>
      <p className="clausula">
        O presente Convênio tem por objeto estabelecer as condições gerais para a realização de estágios de estudantes
        regularmente matriculados nos cursos de graduação, pós-graduação, ensino médio, profissional e especial da
        <strong> CONCEDENTE</strong>, em conformidade com o disposto na Lei n.º 11.788/2008, proporcionando ao estagiário
        complementação educacional e preparação para o mercado de trabalho, assegurada a supervisão pedagógica pela
        instituição de ensino e a supervisão técnica pela empresa concedente de estágio.
      </p>

      <h3>Cláusula Segunda — Das Partes e Responsabilidades</h3>

      <p className="clausula"><strong>§ 1.º — Compete ao AGENTE:</strong></p>
      <div className="paragrafo">
        <p>I – Manter cadastro atualizado de estudantes habilitados a realizar estágios;</p>
        <p>II – Identificar oportunidades de estágio e encaminhar candidatos às empresas e órgãos concedentes compatíveis com o perfil acadêmico e profissional do estagiário;</p>
        <p>III – Elaborar e formalizar o <strong>Termo de Compromisso de Estágio (TCE)</strong> entre o estudante, a parte concedente e a CONCEDENTE, nos termos do art. 7.º da Lei n.º 11.788/2008;</p>
        <p>IV – Manter sistema digital de acompanhamento que permita à CONCEDENTE, ao estagiário e à parte concedente acesso em tempo real às informações do estágio, incluindo registros de atividades, avaliações e documentos;</p>
        <p>V – Zelar pelo cumprimento da legislação de estágio, notificando as partes em caso de irregularidade;</p>
        <p>VI – Gerenciar o pagamento das bolsas de estágio e demais verbas previstas no TCE, quando aplicável e pactuado;</p>
        <p>VII – Emitir documentação comprobatória de estágio ao seu término, para fins de portfólio do estudante;</p>
        <p>VIII – Manter sigilo sobre as informações acadêmicas e pessoais dos estudantes, em conformidade com a Lei n.º 13.709/2018 (LGPD);</p>
        <p>IX – Disponibilizar à CONCEDENTE acesso gratuito ao sistema de gestão para acompanhamento dos estágios dos seus estudantes.</p>
      </div>

      <p className="clausula"><strong>§ 2.º — Compete à CONCEDENTE:</strong></p>
      <div className="paragrafo">
        <p>I – Indicar professor orientador para cada estagiário, vinculado à área de conhecimento do curso, que acompanhará o desenvolvimento das atividades previstas no plano de estágio;</p>
        <p>II – Avaliar as condições do local de estágio e emitir relatório semestral de acompanhamento do estudante, conforme previsto no art. 9.º, VII, da Lei n.º 11.788/2008;</p>
        <p>III – Emitir, quando solicitado, declaração de regularidade de matrícula e frequência do estudante, bem como declaração de compatibilidade entre o estágio e as atividades do curso;</p>
        <p>IV – Comunicar ao AGENTE, com a maior brevidade possível, quaisquer situações que impliquem interrupção do estágio, incluindo abandono, trancamento de matrícula, colação de grau ou afastamento;</p>
        <p>V – Manter o AGENTE informado sobre alterações na grade curricular ou regulamentos internos que possam afetar a realização dos estágios;</p>
        <p>VI – Designar coordenador responsável para ser o ponto de contato com o AGENTE;</p>
        <p>VII – Colaborar para que o número máximo de estagiários por turno e por estabelecimento respeite os limites impostos pelos arts. 17 e 18 da Lei n.º 11.788/2008.</p>
      </div>

      <h3>Cláusula Terceira — Das Condições Gerais do Estágio</h3>
      <p className="clausula">
        Os estágios realizados ao abrigo deste Convênio observarão, obrigatoriamente, as seguintes condições gerais,
        que deverão constar do Termo de Compromisso de Estágio (TCE) celebrado a cada contratação:
      </p>
      <div className="paragrafo">
        <p>I – O estágio será realizado em jornada compatível com o horário escolar do estagiário, nunca superior a seis horas diárias e trinta horas semanais, salvo hipóteses previstas em lei;</p>
        <p>II – Ao estagiário com jornada de estágio igual ou superior a quatro horas diárias será assegurado recesso remunerado de trinta dias a cada doze meses de estágio na mesma parte concedente, preferencialmente no período de recesso escolar;</p>
        <p>III – O estagiário não poderá ser mantido em quaisquer das hipóteses que caracterizem vínculo empregatício, nos termos do art. 3.º da Lei n.º 11.788/2008;</p>
        <p>IV – A rescisão do estágio será comunicada pelas partes ao AGENTE com antecedência mínima de trinta dias ou imediatamente nos casos previstos no TCE;</p>
        <p>V – A cobertura de acidentes pessoais em favor do estagiário por meio de apólice de seguro será de responsabilidade da parte concedente ou do AGENTE, conforme acordado no TCE.</p>
      </div>

      <h3>Cláusula Quarta — Da Gratuidade</h3>
      <p className="clausula">
        O presente Convênio é celebrado em caráter gratuito para a <strong>CONCEDENTE</strong>, que não arcará com
        qualquer custo pela intermediação do AGENTE. Os honorários do AGENTE são de responsabilidade exclusiva das
        empresas e órgãos contratantes dos estagiários (partes concedentes de estágio), nos termos pactuados em
        instrumentos próprios.
      </p>

      <h3>Cláusula Quinta — Do Sigilo e Proteção de Dados</h3>
      <p className="clausula">
        As partes se comprometem a manter em absoluto sigilo todas as informações pessoais, acadêmicas e profissionais
        dos estudantes e demais envolvidos, tratando tais dados em estrita conformidade com a Lei Geral de Proteção de
        Dados Pessoais (Lei n.º 13.709/2018 — LGPD). Os dados serão utilizados exclusivamente para as finalidades
        previstas neste Convênio, sendo vedada a transferência a terceiros sem o consentimento expresso do titular.
      </p>
      <p>
        O AGENTE, na qualidade de Operador conforme definido pela LGPD, compromete-se a adotar medidas técnicas e
        organizacionais adequadas para proteger os dados pessoais contra acessos não autorizados, destruição,
        perda, alteração, comunicação ou qualquer outra forma de tratamento inadequado ou ilícito.
      </p>

      <h3>Cláusula Sexta — Da Inexistência de Vínculo</h3>
      <p className="clausula">
        O presente Convênio não cria qualquer vínculo empregatício entre as partes, suas entidades, prepostos ou
        colaboradores. O AGENTE atua de forma autônoma e independente, não podendo ser considerado empregador,
        parceiro comercial ou preposto da CONCEDENTE, nem esta ser responsabilizada pelos atos do AGENTE perante
        terceiros que não decorram expressamente de obrigações previstas neste instrumento.
      </p>

      <h3>Cláusula Sétima — Da Vigência e Renovação</h3>
      <p className="clausula">
        Este Convênio entra em vigor na data de sua assinatura, com prazo de vigência indeterminado, podendo ser
        rescindido por qualquer das partes mediante notificação escrita com antecedência mínima de <strong>60 (sessenta)
        dias</strong>, sem prejuízo das obrigações em curso relativas aos Termos de Compromisso de Estágio já celebrados
        e ainda vigentes.
      </p>
      <p>
        A rescisão antecipada não desobrigará as partes do cumprimento dos TCEs em vigor até o seu término natural
        ou até a sua rescisão individual, conforme cada caso.
      </p>

      <h3>Cláusula Oitava — Das Penalidades</h3>
      <p className="clausula">
        O descumprimento das obrigações previstas neste Convênio sujeitará a parte inadimplente às penalidades cabíveis,
        incluindo, conforme o caso:
      </p>
      <div className="paragrafo">
        <p>I – Notificação extrajudicial;</p>
        <p>II – Rescisão motivada do Convênio, independentemente de indenização;</p>
        <p>III – Comunicação ao Ministério do Trabalho e Emprego, quando configurada violação à Lei n.º 11.788/2008;</p>
        <p>IV – Medidas judiciais cabíveis para reparação de danos materiais e morais.</p>
      </div>

      <h3>Cláusula Nona — Das Disposições Gerais</h3>
      <div className="paragrafo">
        <p>I – As partes poderão, de comum acordo, alterar as condições deste Convênio mediante aditivo escrito devidamente assinado pelos representantes legais;</p>
        <p>II – Este instrumento substitui quaisquer entendimentos anteriores, verbais ou escritos, relativos ao mesmo objeto;</p>
        <p>III – A tolerância ou o não exercício de qualquer dos direitos assegurados neste Convênio não importará em novação, renúncia ou alteração do que aqui ficou estipulado;</p>
        <p>IV – Caso qualquer disposição deste Convênio seja considerada inválida ou inaplicável, as demais permanecerão em pleno vigor.</p>
      </div>

      <h3>Cláusula Décima — Do Foro</h3>
      <p className="clausula">
        Fica eleito o foro da <strong>Comarca de {smarter.cidade || "sede do AGENTE"}/{smarter.uf || "—"}</strong> para
        dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer outro, por
        mais privilegiado que seja.
      </p>

      <p style={{ marginTop: "2rem", textAlign: "center", fontWeight: 600 }}>
        E, por estarem assim justas e acordadas, as partes assinam o presente Convênio eletronicamente.
      </p>
      <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem" }}>
        {ies.cidade || "—"}, {dataFormatada}
      </p>

      {/* Bloco de assinatura */}
      {modo === "assinado" && assinanteName ? (
        <div className="assinatura-bloco mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-green-700 font-bold mb-1">✅ DOCUMENTO ASSINADO ELETRONICAMENTE</p>
          <p className="text-xs text-green-800">
            Assinado por: <strong>{assinanteName}</strong> em {dataFormatada}
          </p>
          {protocolo && <p className="text-xs text-green-700 mt-1">Protocolo: <code>{protocolo}</code></p>}
          <p className="text-[10px] text-green-600 mt-2">
            A assinatura eletrônica deste documento é válida nos termos do art. 10, §2.º, da MP n.º 2.200-2/2001
            e do Marco Civil da Internet (Lei n.º 12.965/2014), tendo sido registrados IP, data, hora e identificação
            do assinante para fins de autenticidade e não-repúdio.
          </p>
        </div>
      ) : modo === "visualizacao" ? (
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-3 mt-8">
              <p className="font-bold text-xs">{smarter.razaoSocial || "SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA."}</p>
              <p className="text-xs text-gray-500">AGENTE DE INTEGRAÇÃO</p>
              <p className="text-xs text-gray-500">CNPJ: {cnpjSmarter}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-3 mt-8">
              <p className="font-bold text-xs">{ies.razaoSocial || ies.name}</p>
              <p className="text-xs text-gray-500">CONCEDENTE</p>
              <p className="text-xs text-gray-500">CNPJ: {cnpjIES}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

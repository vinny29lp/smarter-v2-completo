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
    cargoResponsavel?: string;
    email?: string;
    telefone?: string;
    logoDocUrl?: string;
    assinaturaUrl?: string;
  };
  dataAssinatura?: Date | null;
  assinanteName?: string;
  protocolo?: string;
  modo?: "visualizacao" | "assinado";
}

const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export default function MinutaConvenio({ ies, smarter, dataAssinatura, assinanteName, protocolo, modo = "visualizacao" }: MinutaProps) {
  const hoje = new Date();
  const dataBase = dataAssinatura ? new Date(dataAssinatura) : hoje;
  const dataFormatada = `${dataBase.getDate()} de ${meses[dataBase.getMonth()]} de ${dataBase.getFullYear()}`;

  const cnpjSmarter = smarter.cnpj || "";
  const cnpjIES = ies.cnpj || "a ser informado";

  return (
    <div className="minuta-convenio font-sans text-sm text-gray-900 leading-relaxed">
      <style>{`
        .minuta-convenio { max-width: 720px; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; color: #1a1a1a; line-height: 1.6; }
        .minuta-convenio .minuta-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f2a5e; padding-bottom: 12px; margin-bottom: 20px; }
        .minuta-convenio .minuta-header-logo { background: #0f2a5e; border-radius: 8px; padding: 8px 14px; display: flex; align-items: center; }
        .minuta-convenio .minuta-header-logo img { height: 32px; object-fit: contain; display: block; }
        .minuta-convenio .minuta-header-logo-placeholder { color: #f5c400; font-weight: 900; font-size: 18px; letter-spacing: -0.5px; }
        .minuta-convenio .minuta-header-title { text-align: right; }
        .minuta-convenio .minuta-doc-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0f2a5e; }
        .minuta-convenio .minuta-doc-sub { font-size: 9px; color: #888; margin-top: 2px; }
        .minuta-convenio h3 { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; margin-top: 1.4rem; margin-bottom: 0.4rem; color: white; background: #0f2a5e; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.04em; }
        .minuta-convenio p { margin-bottom: 0.65rem; text-align: justify; font-size: 11px; line-height: 1.65; }
        .minuta-convenio .paragrafo { margin-left: 1.25rem; margin-top: 0.4rem; }
        .minuta-convenio .paragrafo p { margin-bottom: 0.3rem; font-size: 10.5px; }
        .minuta-convenio strong { font-weight: 700; color: #0f2a5e; }
        .minuta-convenio .partes-bloco { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; font-size: 10.5px; }
        .minuta-convenio .partes-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 0.25rem; }
        .minuta-convenio .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; }
        .minuta-convenio .assinatura-item { text-align: center; }
        .minuta-convenio .assinatura-linha { border-top: 1px solid #333; min-height: 60px; margin-bottom: 6px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; }
        .minuta-convenio .assinatura-carimbo { max-height: 70px; max-width: 180px; object-fit: contain; display: block; margin: 0 auto 4px; }
        .minuta-convenio .assinatura-logo-box { background: #0f2a5e; border-radius: 6px; padding: 5px 10px; display: inline-block; margin-bottom: 4px; }
        .minuta-convenio .assinatura-logo-box img { height: 22px; object-fit: contain; display: block; }
        .minuta-convenio .assinatura-nome { font-weight: 700; font-size: 9.5px; }
        .minuta-convenio .assinatura-cargo { font-size: 8.5px; color: #64748b; }
        .minuta-convenio .assinatura-cnpj { font-size: 8px; color: #94a3b8; }
        .minuta-convenio .local-data { text-align: right; color: #64748b; font-size: 10px; margin-top: 1.5rem; margin-bottom: 0.5rem; font-style: italic; }
        .minuta-convenio .watermark-text { text-align: center; color: #94a3b8; font-size: 8px; margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 6px; }
      `}</style>

      {/* CABEÇALHO — estilo documento institucional */}
      <div className="minuta-header">
        <div className="minuta-header-logo">
          {smarter.logoDocUrl
            ? <img src={smarter.logoDocUrl} alt="Smarter Estágios" />
            : <span className="minuta-header-logo-placeholder">S</span>
          }
        </div>
        <div className="minuta-header-title">
          <div className="minuta-doc-title">Convênio de Estágio</div>
          <div className="minuta-doc-sub">Instrumento Particular — Lei n.º 11.788/2008</div>
        </div>
      </div>

      {/* QUALIFICAÇÃO DAS PARTES */}
      <div className="partes-bloco">
        <p className="partes-label">Concedente (Instituição de Ensino)</p>
        <p style={{margin:0}}>
          <strong>{ies.razaoSocial || ies.name}</strong>, CNPJ n.º <strong>{cnpjIES}</strong>,
          com sede em <strong>{ies.endereco || "endereço a ser informado"}</strong>,{" "}
          <strong>{ies.cidade || "—"}/{ies.uf || "—"}</strong>,
          representada por <strong>{ies.coordenador || "____________________"}</strong>,
          na qualidade de <strong>{ies.cargoCoord || "Coordenador(a)"}</strong> —
          doravante denominada <strong>CONCEDENTE</strong>;
        </p>
      </div>
      <div className="partes-bloco" style={{marginTop:"0.5rem"}}>
        <p className="partes-label">Agente de Integração</p>
        <p style={{margin:0}}>
          <strong>{smarter.razaoSocial || "SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA."}</strong>,
          CNPJ n.º <strong>{cnpjSmarter}</strong>,
          com sede em <strong>{smarter.endereco || "endereço da Smarter"}</strong>,{" "}
          <strong>{smarter.cidade || "—"}/{smarter.uf || "—"}</strong>,
          representada por <strong>{smarter.responsavel || "____________________"}</strong> —
          doravante denominada <strong>AGENTE</strong>;
        </p>
      </div>
      <p style={{marginTop:"1rem"}}>
        Resolvem celebrar o presente Convênio de Estágio, vinculado à Lei n.º 11.788, de 25 de setembro de 2008,
        mediante as cláusulas e condições seguintes:
      </p>

      {/* CL. 1 */}
      <h3>Cláusula Primeira — Do Objeto</h3>
      <p>
        O presente Convênio tem por objeto estabelecer as condições gerais para a realização de estágios de estudantes
        regularmente matriculados nos cursos de graduação, pós-graduação, ensino médio, profissional e especial da{" "}
        <strong>CONCEDENTE</strong>, em conformidade com a Lei n.º 11.788/2008, proporcionando ao estagiário
        complementação educacional e preparação para o mercado de trabalho, assegurada a supervisão pedagógica pela
        instituição de ensino e a supervisão técnica pela empresa concedente de estágio.
      </p>

      {/* CL. 2 */}
      <h3>Cláusula Segunda — Das Partes e Responsabilidades</h3>

      <p><strong>§ 1.º — Compete ao AGENTE:</strong></p>
      <div className="paragrafo">
        <p>I – Manter cadastro atualizado de estudantes habilitados a realizar estágios;</p>
        <p>II – Identificar oportunidades de estágio e encaminhar candidatos às empresas e órgãos concedentes compatíveis com o perfil acadêmico e profissional do estagiário;</p>
        <p>III – Elaborar e formalizar o <strong>Termo de Compromisso de Estágio (TCE)</strong> entre o estudante, a parte concedente e a CONCEDENTE, nos termos do art. 7.º da Lei n.º 11.788/2008;</p>
        <p>IV – Manter sistema digital de acompanhamento que permita à CONCEDENTE, ao estagiário e à parte concedente acesso em tempo real às informações do estágio, incluindo registros de atividades, avaliações e documentos;</p>
        <p>V – Zelar pelo cumprimento da legislação de estágio, notificando as partes em caso de irregularidade;</p>
        <p>VI – Quando expressamente contratado, o AGENTE poderá operacionalizar ou intermediar os pagamentos de bolsas de estágio e demais verbas previstas no TCE;</p>
        <p>VII – Emitir documentação comprobatória de estágio ao seu término, para fins de portfólio do estudante;</p>
        <p>VIII – Manter sigilo sobre as informações acadêmicas e pessoais dos estudantes, em conformidade com a Lei n.º 13.709/2018 (LGPD);</p>
        <p>IX – Disponibilizar à CONCEDENTE acesso gratuito ao sistema de gestão para acompanhamento dos estágios dos seus estudantes.</p>
      </div>

      <p style={{marginTop:"0.75rem"}}><strong>§ 2.º — Compete à CONCEDENTE:</strong></p>
      <div className="paragrafo">
        <p>I – Indicar professor orientador para cada estagiário, vinculado à área de conhecimento do curso, que acompanhará o desenvolvimento das atividades previstas no plano de estágio;</p>
        <p>II – Avaliar as condições do local de estágio e emitir relatório semestral de acompanhamento do estudante, conforme previsto no art. 9.º, VII, da Lei n.º 11.788/2008;</p>
        <p>III – Emitir, quando solicitado, declaração de regularidade de matrícula e frequência do estudante, bem como declaração de compatibilidade entre o estágio e as atividades do curso;</p>
        <p>IV – Comunicar ao AGENTE, com a maior brevidade possível, quaisquer situações que impliquem interrupção do estágio, incluindo abandono, trancamento de matrícula, colação de grau ou afastamento;</p>
        <p>V – Manter o AGENTE informado sobre alterações na grade curricular ou regulamentos internos que possam afetar a realização dos estágios;</p>
        <p>VI – Designar coordenador responsável para ser o ponto de contato com o AGENTE;</p>
        <p>VII – Colaborar para que o número máximo de estagiários por turno e por estabelecimento respeite os limites impostos pelos arts. 17 e 18 da Lei n.º 11.788/2008.</p>
      </div>

      {/* CL. 3 */}
      <h3>Cláusula Terceira — Das Condições Gerais do Estágio</h3>
      <p>
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

      {/* CL. 4 */}
      <h3>Cláusula Quarta — Da Gratuidade</h3>
      <p>
        O presente Convênio é celebrado em caráter gratuito para a <strong>CONCEDENTE</strong>, que não arcará com
        qualquer custo pela intermediação do AGENTE. Os honorários do AGENTE são de responsabilidade exclusiva das
        empresas e órgãos contratantes dos estagiários (partes concedentes de estágio), nos termos pactuados em
        instrumentos próprios.
      </p>

      {/* CL. 5 */}
      <h3>Cláusula Quinta — Do Sigilo e Proteção de Dados</h3>
      <p>
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

      {/* CL. 6 */}
      <h3>Cláusula Sexta — Da Inexistência de Vínculo</h3>
      <p>
        O presente Convênio não cria qualquer vínculo empregatício entre as partes, suas entidades, prepostos ou
        colaboradores. O AGENTE atua de forma autônoma e independente, não podendo ser considerado empregador,
        parceiro comercial ou preposto da CONCEDENTE.
      </p>

      {/* CL. 7 — NOVA: Limitação de Responsabilidade */}
      <h3>Cláusula Sétima — Da Limitação de Responsabilidade do AGENTE</h3>
      <p>
        O <strong>AGENTE</strong> não responde por atos praticados pela empresa concedente, pelo estudante ou pela
        instituição de ensino no desempenho de suas respectivas obrigações. Sua responsabilidade limita-se às
        atividades legalmente atribuídas ao agente de integração pela Lei n.º 11.788/2008 e àquelas expressamente
        previstas neste instrumento.
      </p>
      <p>
        O AGENTE não poderá ser responsabilizado por danos decorrentes de atos unilaterais das demais partes, por
        inadimplemento contratual da empresa concedente em relação ao estagiário, nem por fatos exclusivos de
        terceiros estranhos a este Convênio.
      </p>

      {/* CL. 8 — NOVA: Não-Exclusividade */}
      <h3>Cláusula Oitava — Da Não-Exclusividade</h3>
      <p>
        O presente Convênio <strong>não estabelece qualquer exclusividade</strong> entre as partes. A{" "}
        <strong>CONCEDENTE</strong> poderá celebrar instrumentos semelhantes com outros agentes de integração de
        estágio, desde que observados os requisitos legais aplicáveis.
      </p>
      <p>
        Da mesma forma, o AGENTE poderá firmar convênios com outras instituições de ensino, independentemente de
        comunicação prévia à CONCEDENTE.
      </p>

      {/* CL. 9 */}
      <h3>Cláusula Nona — Da Vigência e Renovação</h3>
      <p>
        Este Convênio entra em vigor na data de sua assinatura, com prazo de vigência indeterminado, podendo ser
        rescindido por qualquer das partes mediante notificação escrita com antecedência mínima de{" "}
        <strong>60 (sessenta) dias</strong>, sem prejuízo das obrigações em curso relativas aos Termos de Compromisso
        de Estágio já celebrados e ainda vigentes.
      </p>
      <p>
        A rescisão antecipada não desobrigará as partes do cumprimento dos TCEs em vigor até o seu término natural
        ou até a sua rescisão individual, conforme cada caso.
      </p>

      {/* CL. 10 */}
      <h3>Cláusula Décima — Das Penalidades</h3>
      <p>
        O descumprimento das obrigações previstas neste Convênio sujeitará a parte inadimplente às penalidades cabíveis,
        incluindo, conforme o caso:
      </p>
      <div className="paragrafo">
        <p>I – Notificação extrajudicial;</p>
        <p>II – Rescisão motivada do Convênio, independentemente de indenização;</p>
        <p>III – Comunicação ao Ministério do Trabalho e Emprego, quando configurada violação à Lei n.º 11.788/2008;</p>
        <p>IV – Medidas judiciais cabíveis para reparação de danos materiais e morais.</p>
      </div>

      {/* CL. 11 */}
      <h3>Cláusula Décima Primeira — Das Disposições Gerais</h3>
      <div className="paragrafo">
        <p>I – As partes poderão, de comum acordo, alterar as condições deste Convênio mediante aditivo escrito devidamente assinado pelos representantes legais;</p>
        <p>II – Este instrumento substitui quaisquer entendimentos anteriores, verbais ou escritos, relativos ao mesmo objeto;</p>
        <p>III – A tolerância ou o não exercício de qualquer dos direitos assegurados neste Convênio não importará em novação, renúncia ou alteração do que aqui ficou estipulado;</p>
        <p>IV – Caso qualquer disposição deste Convênio seja considerada inválida ou inaplicável, as demais permanecerão em pleno vigor.</p>
      </div>

      {/* CL. 12 — NOVA: Assinatura Eletrônica */}
      <h3>Cláusula Décima Segunda — Da Validade da Assinatura Eletrônica</h3>
      <p>
        As partes concordam expressamente que a assinatura eletrônica deste instrumento possui plena validade jurídica,
        nos termos do art. 10, § 2.º, da Medida Provisória n.º 2.200-2/2001 e do art. 7.º da Lei n.º 14.063/2020,
        sendo equiparada à assinatura manuscrita para todos os fins de direito.
      </p>
      <p>
        O sistema do AGENTE registrará, para fins de autenticidade e não-repúdio, os seguintes dados no ato da
        assinatura: (a) nome completo e CPF do assinante; (b) endereço de IP e data/hora com fuso horário; (c)
        user-agent do dispositivo utilizado; (d) confirmação expressa de leitura da minuta e de autoridade para
        representar a CONCEDENTE. Tais registros integram o log de auditoria do documento e poderão ser apresentados
        como prova em eventual litígio.
      </p>

      {/* CL. 13 */}
      <h3>Cláusula Décima Terceira — Do Foro</h3>
      <p>
        Fica eleito o foro da <strong>Comarca de {smarter.cidade || "sede do AGENTE"}/{smarter.uf || "—"}</strong> para
        dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer outro, por
        mais privilegiado que seja.
      </p>

      {/* LOCAL E DATA */}
      <p className="local-data">
        {ies.cidade || smarter.cidade || "—"}, {dataFormatada}
      </p>
      <p style={{ textAlign: "center", fontWeight: 600, fontSize: "0.8rem", marginBottom: "0.25rem" }}>
        E, por estarem assim justas e acordadas, as partes assinam o presente Convênio.
      </p>

      {/* BLOCO DE ASSINATURAS */}
      {modo === "assinado" && assinanteName ? (
        <>
          <div className="assinatura-grid">
            {/* Smarter — ASSINADO */}
            <div className="assinatura-item">
              <div className="assinatura-linha">
                {smarter.assinaturaUrl && (
                  <img src={smarter.assinaturaUrl} alt="Assinatura Smarter" className="assinatura-carimbo" />
                )}
              </div>
              <p className="assinatura-nome">{smarter.razaoSocial || "SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA."}</p>
              <p className="assinatura-cargo">{smarter.responsavel || "Vinicius Miranda de Freitas Paiva"}</p>
              <p className="assinatura-cargo">{smarter.cargoResponsavel || "Diretor(a)"} — AGENTE DE INTEGRAÇÃO</p>
              <p className="assinatura-cnpj">CNPJ: {cnpjSmarter}</p>
            </div>
            {/* IES — ASSINADO */}
            <div className="assinatura-item">
              <div className="assinatura-linha"></div>
              <p className="assinatura-nome">{ies.razaoSocial || ies.name}</p>
              <p className="assinatura-cargo">{assinanteName}</p>
              <p className="assinatura-cargo">CONCEDENTE</p>
              <p className="assinatura-cnpj">CNPJ: {cnpjIES}</p>
            </div>
          </div>
          <div className="watermark-text">
            ✅ Documento assinado eletronicamente em {dataFormatada} — validade jurídica conforme art. 10, §2.º, MP n.º 2.200-2/2001 e Lei n.º 14.063/2020
            {protocolo && ` — Protocolo: ${protocolo}`}
          </div>
        </>
      ) : modo === "visualizacao" ? (
        <div className="assinatura-grid">
          {/* Smarter */}
          <div className="assinatura-item">
            <div className="assinatura-linha">
              {smarter.assinaturaUrl && (
                <img src={smarter.assinaturaUrl} alt="Assinatura Smarter" className="assinatura-carimbo" />
              )}
            </div>
            <p className="assinatura-nome">{smarter.razaoSocial || "SMARTER ESTÁGIOS AGENTE DE INTEGRAÇÃO LTDA."}</p>
            <p className="assinatura-cargo">{smarter.responsavel || "Vinicius Miranda de Freitas Paiva"}</p>
            <p className="assinatura-cargo">{smarter.cargoResponsavel || "Diretor(a)"} — AGENTE DE INTEGRAÇÃO</p>
            <p className="assinatura-cnpj">CNPJ: {cnpjSmarter}</p>
          </div>
          {/* IES */}
          <div className="assinatura-item">
            <div className="assinatura-linha"></div>
            <p className="assinatura-nome">{ies.razaoSocial || ies.name}</p>
            <p className="assinatura-cargo">{ies.coordenador || "Representante Legal"}</p>
            <p className="assinatura-cargo">{ies.cargoCoord || "CONCEDENTE"}</p>
            <p className="assinatura-cnpj">CNPJ: {cnpjIES}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

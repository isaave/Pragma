import React from 'react';
import { X } from 'lucide-react';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 30, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1000,
        boxSizing: 'border-box',
    },
    modal: {
        background: '#ffffff',
        borderRadius: '20px',
        width: 'min(720px, 100%)',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(3, 7, 30, 0.25)',
        fontFamily: FONT,
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '24px 28px 16px',
        borderBottom: '1px solid #eef2f7',
    },
    title: { fontSize: '20px', fontWeight: 700, color: '#03071e', margin: 0 },
    close: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#64748b',
        padding: '4px',
        display: 'flex',
    },
    content: {
        padding: '20px 28px 28px',
        overflowY: 'auto',
        color: '#334155',
        fontSize: '13.5px',
        lineHeight: 1.6,
    },
    sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#0f172e', margin: '18px 0 6px' },
    paragraph: { margin: '0 0 10px' },
    list: { margin: '0 0 10px', paddingLeft: '20px' },
    contact: { margin: '16px 0 0', fontWeight: 600, color: '#1d4ed8' },
    link: { color: '#1d4ed8', textDecoration: 'underline' },
};

const terms = [
    {
        title: 'Data efetiva',
        paragraphs: [
            'Estes Termos de Uso entram em vigor a partir de 10 de novembro de 2026.',
        ],
    },
    {
        title: '2. Aceitação dos Termos',
        paragraphs: [
            'Ao aceder e utilizar o sistema Pragma ("Sistema"), concorda expressamente com os presentes Termos de Uso. Caso não concorde com qualquer disposição aqui descrita, deverá cessar imediatamente a utilização da plataforma.',
        ],
    },
    {
        title: '3. Descrição do Serviço',
        paragraphs: [
            'O Pragma é uma ferramenta de gestão administrativa em formato SaaS (Software as a Service), que inclui controlo de pedidos, cardápio, estoque, relatórios e administração de utilizadores, destinada ao uso operacional e gerencial por estabelecimentos comerciais devidamente licenciados.',
        ],
    },
    {
        title: '4. Contas de Utilizador, Acesso e Credenciais',
        list: [
            'Credenciais Individuais: cada utilizador recebe um acesso pessoal e intransmissível (e-mail e senha inicial). É expressamente proibida a partilha de credenciais com terceiros.',
            'Hierarquia e Permissões: o sistema opera com base em papéis e níveis de acesso definidos pela administração (ex.: Chefe/Gestor e Atendente). O utilizador compromete-se a operar estritamente dentro das permissões atribuídas ao seu cargo.',
            'Segurança da Conta: o utilizador é o único responsável por manter a confidencialidade da sua senha e por todas as ações executadas através da sua conta.',
        ],
    },
    {
        title: '5. Uso Aceitável',
        paragraphs: ['O utilizador compromete-se a abster-se de:'],
        list: [
            'Utilizar a plataforma para fins ilegais, fraudulentos ou não autorizados.',
            'Tentar burlar mecanismos de segurança, aceder a dados de outros estabelecimentos (em caso de arquitetura multi-tenant) ou efetuar engenharia reversa no código-fonte.',
            'Inserir dados falsos, corrompidos ou maliciosos nos módulos de produtos, estoque ou registos de transações.',
        ],
    },
    {
        title: '6. Propriedade Intelectual',
        paragraphs: [
            'Todos os direitos de propriedade intelectual, códigos-fonte, design, arquitetura e logótipos associados ao Pragma pertencem exclusivamente aos seus desenvolvedores. O uso do sistema não transfere nenhum direito de propriedade sobre o software ao estabelecimento ou aos seus colaboradores.',
        ],
    },
    {
        title: '7. Modificações dos Termos',
        paragraphs: [
            'Estes termos poderão ser atualizados periodicamente para refletir melhorias ou novas funcionalidades do sistema. O uso continuado da plataforma após a publicação de alterações implica a aceitação automática dos novos termos.',
        ],
    },
];

const privacy = [
    {
        title: 'Data efetiva',
        paragraphs: [
            'Esta Política de Privacidade entra em vigor a partir de 10 de novembro de 2026.',
        ],
    },
    {
        title: '1. Compromisso com a Privacidade',
        paragraphs: [
            'O Pragma respeita a privacidade dos seus utilizadores e está comprometido com a proteção dos dados pessoais, agindo em total conformidade com as diretrizes da Lei Geral de Proteção de Dados (LGPD — Lei n.º 13.709/2018) e demais normativas aplicáveis.',
        ],
    },
    {
        title: '3. Dados Recolhidos',
        paragraphs: ['Para o funcionamento adequado da plataforma, recolhemos e processamos as seguintes categorias de dados:'],
        list: [
            'Dados de Identificação: nome completo e endereço de e-mail corporativo ou pessoal fornecido no momento do registo.',
            'Dados Profissionais: cargo, nível de acesso, restrições e status operacional (ativo/inativo) no sistema.',
            'Dados de Registo e Atividade: registos de data e hora (timestamps), histórico de ações administrativas, alterações de estoque e gestão de pedidos realizados na plataforma.',
        ],
    },
    {
        title: '4. Finalidade do Tratamento de Dados',
        paragraphs: ['Os dados recolhidos são estritamente necessários para:'],
        list: [
            'Autenticação segura de utilizadores e gestão de sessões via tokens de acesso.',
            'Auditoria interna e responsabilização operacional (registo de ações efetuadas por cada colaborador dentro do sistema do estabelecimento).',
            'Suporte técnico, melhoria contínua da experiência do utilizador e comunicação operacional.',
        ],
    },
    {
        title: '5. Partilha e Segurança da Informação',
        list: [
            'Os dados processados pelo Pragma não são comercializados, alugados ou cedidos a terceiros para fins publicitários ou comerciais.',
            'O acesso aos dados operacionais de cada estabelecimento é estritamente restrito aos administradores autorizados pela própria empresa cliente.',
            'Implementamos medidas técnicas e organizacionais de segurança da informação (como encriptação de senhas com hash e proteção de rotas via API) para mitigar riscos de acessos não autorizados.',
        ],
    },
    {
        title: '6. Retenção e Eliminação de Dados',
        paragraphs: [
            'Os dados pessoais serão armazenados durante o período em que o utilizador mantiver vínculo ativo com a empresa cliente. Após a desativação da conta, os dados poderão ser eliminados ou anonimizados, respeitando os prazos legais de retenção aplicáveis à atividade comercial.',
        ],
    },
    {
        title: '7. Contacto',
        paragraphs: [
            'Para esclarecimentos de dúvidas sobre esta Política de Privacidade ou para o exercício de direitos relativos aos seus dados pessoais, o utilizador deverá contactar o administrador do sistema ou o responsável de privacidade da empresa/estabelecimento onde presta serviço.',
        ],
    },
];

const documents = {
    terms: { title: 'Termos de Uso', sections: terms },
    privacy: { title: 'Política de Privacidade', sections: privacy },
};

export default function LegalModal({ type, onClose }) {
    const doc = documents[type];
    if (!doc) return null;

    return (
        <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{doc.title}</h2>
                    <button type="button" style={styles.close} onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>
                <div style={styles.content}>
                    <p style={{ ...styles.paragraph, fontWeight: 600 }}>
                        Sistema Pragma — House Burguer
                    </p>
                    {doc.sections.map((section) => (
                        <div key={section.title}>
                            <h3 style={styles.sectionTitle}>{section.title}</h3>
                            {section.paragraphs?.map((text) => (
                                <p key={text} style={styles.paragraph}>{text}</p>
                            ))}
                            {section.list && (
                                <ul style={styles.list}>
                                    {section.list.map((item) => (
                                        <li key={item} style={{ marginBottom: '6px' }}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                    <p style={styles.contact}>
                        Suporte e demais dúvidas:{' '}
                        <a href="mailto:ippsolutionpragma@gmail.com" style={styles.link}>
                            ippsolutionpragma@gmail.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

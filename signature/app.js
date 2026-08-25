/**
 * 8April Tech Email Signature Studio Engine
 * Generates email-client compatible HTML tables with inline styling.
 * Logo: https://i.ibb.co/KxJ2ZZpX/fef4f49f-0e55-4c3c-aba0-d877979a0167.png
 */

class SignatureStudio {
    constructor() {
        this.container = document.getElementById('signature-container');
        this.stage = document.getElementById('preview-stage');
        
        // Data State
        this.data = {
            name: 'Rudge Santana',
            role: 'Senior Data & AI Engineer',
            phone: '+55 (11) 99999-8888',
            email: 'rudge.santana@8april.tech',
            linkedin: 'linkedin.com/in/rudgesantana',
            website: '8april.tech',
            logoUrl: 'https://i.ibb.co/KxJ2ZZpX/fef4f49f-0e55-4c3c-aba0-d877979a0167.png'
        };

        this.theme = 'dark-premium';
        this.mode = 'dark';

        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Inputs
        const fields = ['name', 'role', 'phone', 'email', 'linkedin', 'website'];
        fields.forEach(field => {
            const input = document.getElementById(`input-${field}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.data[field] = e.target.value;
                    this.render();
                });
            }
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.theme = target.dataset.theme;
                this.render();
            });
        });

        // Mode switch (Dark vs Light preview backdrop)
        document.getElementById('btn-mode-dark').addEventListener('click', () => {
            document.getElementById('btn-mode-dark').classList.add('active');
            document.getElementById('btn-mode-light').classList.remove('active');
            this.stage.className = 'preview-stage mode-dark';
            this.mode = 'dark';
            this.render();
        });

        document.getElementById('btn-mode-light').addEventListener('click', () => {
            document.getElementById('btn-mode-light').classList.add('active');
            document.getElementById('btn-mode-dark').classList.remove('active');
            this.stage.className = 'preview-stage mode-light';
            this.mode = 'light';
            this.render();
        });

        // Copy buttons
        document.getElementById('btn-copy-html').addEventListener('click', () => this.copyRichTextSignature());
        document.getElementById('btn-copy-code').addEventListener('click', () => this.copyHTMLCode());
    }

    getSignatureHTML() {
        const d = this.data;
        const isDark = this.mode === 'dark';

        // Colors depending on dark/light context
        const textColor = isDark ? '#FFFFFF' : '#0F172A';
        const roleColor = '#06B6D4'; // Soft Cyan accent
        const subTextColor = isDark ? '#94A3B8' : '#64748B';
        const linkColor = '#06B6D4';
        const borderCyan = '#06B6D4';
        const dividerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0';

        if (this.theme === 'dark-premium' || this.theme === 'clean-minimal') {
            return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Plus Jakarta Sans', 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.4; color: ${textColor}; text-align: left;">
    <tr>
        <!-- Logo Column -->
        <td style="vertical-align: middle; padding-right: 18px;">
            <a href="https://${d.website}" target="_blank" style="text-decoration: none; display: block;">
                <img src="${d.logoUrl}" alt="8April Tech" width="85" style="display: block; border: 0; max-width: 85px; height: auto; border-radius: 8px;">
            </a>
        </td>

        <!-- Vertical Cyan Accent Bar -->
        <td style="width: 2px; background-color: ${borderCyan}; padding: 0;" width="2"></td>

        <!-- Content Column -->
        <td style="vertical-align: middle; padding-left: 18px;">
            <table cellpadding="0" cellspacing="0" border="0">
                <!-- Name -->
                <tr>
                    <td style="font-family: 'Plus Jakarta Sans', 'Inter', Arial, sans-serif; font-size: 17px; font-weight: 700; color: ${textColor}; letter-spacing: -0.2px; padding-bottom: 2px;">
                        ${d.name}
                    </td>
                </tr>
                <!-- Role -->
                <tr>
                    <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; font-weight: 600; color: ${roleColor}; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px;">
                        ${d.role}
                    </td>
                </tr>

                <!-- Divider Line -->
                <tr>
                    <td style="padding-bottom: 8px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td style="border-bottom: 1px solid ${dividerColor}; height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Contact Details -->
                <tr>
                    <td style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: ${subTextColor};">
                        <!-- Phone & Email -->
                        <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                ${d.phone ? `
                                <td style="padding-right: 12px;">
                                    <span style="color: ${roleColor}; font-weight: bold;">T:</span> 
                                    <a href="tel:${d.phone.replace(/\s+/g, '')}" style="color: ${subTextColor}; text-decoration: none;">${d.phone}</a>
                                </td>` : ''}
                                ${d.email ? `
                                <td>
                                    <span style="color: ${roleColor}; font-weight: bold;">E:</span> 
                                    <a href="mailto:${d.email}" style="color: ${linkColor}; text-decoration: none; font-weight: 500;">${d.email}</a>
                                </td>` : ''}
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Website & LinkedIn Links -->
                <tr>
                    <td style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: ${subTextColor}; padding-top: 4px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                ${d.website ? `
                                <td style="padding-right: 12px;">
                                    <a href="https://${d.website}" target="_blank" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">www.${d.website}</a>
                                </td>` : ''}
                                ${d.linkedin ? `
                                <td>
                                    <span style="color: ${subTextColor};">•</span> 
                                    <a href="https://${d.linkedin}" target="_blank" style="color: ${subTextColor}; text-decoration: none; padding-left: 6px;">LinkedIn</a>
                                </td>` : ''}
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>`.trim();
        } else {
            // Compact Horizontal Bar Theme
            return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: ${textColor}; text-align: left;">
    <tr>
        <td style="padding-bottom: 10px;">
            <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="vertical-align: middle; padding-right: 14px;">
                        <img src="${d.logoUrl}" alt="8April Tech" width="60" style="display: block; border: 0; width: 60px; height: auto;">
                    </td>
                    <td style="vertical-align: middle;">
                        <div style="font-size: 16px; font-weight: 700; color: ${textColor};">${d.name}</div>
                        <div style="font-size: 12px; font-weight: 600; color: ${roleColor}; text-transform: uppercase; letter-spacing: 0.5px;">${d.role}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="border-top: 2px solid ${borderCyan}; padding-top: 8px; font-size: 12px; color: ${subTextColor};">
            <span><strong>E:</strong> <a href="mailto:${d.email}" style="color: ${linkColor}; text-decoration: none;">${d.email}</a></span>
            <span style="padding: 0 6px;">•</span>
            <span><strong>T:</strong> ${d.phone}</span>
            <span style="padding: 0 6px;">•</span>
            <span><a href="https://${d.website}" target="_blank" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">${d.website}</a></span>
        </td>
    </tr>
</table>`.trim();
        }
    }

    render() {
        const html = this.getSignatureHTML();
        this.container.innerHTML = html;
    }

    async copyRichTextSignature() {
        const html = this.getSignatureHTML();

        try {
            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([this.container.innerText], { type: 'text/plain' });
            
            const clipboardItem = new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText
            });

            await navigator.clipboard.write([clipboardItem]);
            this.showToast('Assinatura copiada! Cole no Gmail/Outlook com Ctrl+V.');
        } catch (err) {
            // Fallback using document.execCommand if Clipboard API is blocked
            const listener = (e) => {
                e.clipboardData.setData('text/html', html);
                e.clipboardData.setData('text/plain', this.container.innerText);
                e.preventDefault();
            };
            document.addEventListener('copy', listener);
            document.execCommand('copy');
            document.removeEventListener('copy', listener);
            this.showToast('Assinatura copiada com sucesso!');
        }
    }

    async copyHTMLCode() {
        const html = this.getSignatureHTML();
        await navigator.clipboard.writeText(html);
        this.showToast('Código HTML copiado para a área de transferência!');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    window.studio = new SignatureStudio();
});

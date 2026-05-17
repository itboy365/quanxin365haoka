// 号卡优选商城 - 主JavaScript文件
// 版本: 3.0 (优化type值顺序：1,2,3)

// 使用IIFE封装，避免全局变量污染
(function() {
    'use strict';
    
    // ==================== 配置常量 ====================
    const CONFIG = {
        WECHAT_ID: "1002473305",
        QRCODE_IMAGE: "images/wechat-qrcode.jpg",
        WECHAT_SCHEME: 'weixin://',
        CHECK_TIMEOUT: 1500,
        // 修改后的平台配置：type值调整为1,2,3连续
        PLATFORMS: [
            {
                id: 1,
                title: "优选套餐服务",
                tag: "一证可查，办卡更安心",
                icon: "crown",
                type: "type-1",  // 保持type-1，蓝色
                features: ["客服全程协助", "四大运营商，套餐任你选", "在线免费申请，快递送到家", "大流量卡，刷剧游戏不断线"],
                link: "https://hk.xuanhaoka.com/s?id=11708",
                buttonText: "立即办理"
            },
            {
                id: 2,
                title: "随身WiFi设备商城",
                tag: "海量设备，极速网络",
                icon: "wifi",
                type: "type-2",  // 从type-7改为type-2，红色
                features: ["海量设备，品牌直供", "极速网络，随身畅享", "一键下单，全国包邮", "专业客服，售后无忧"],
                link: "http://wx.hlkjlink.cn/mall/#/?_=5&uniqid=67dece378b0ea",
                buttonText: "进入商城"
            },
            {
                id: 3,
                title: "企业套餐咨询服务",
                tag: "专属通道，极速开通",
                icon: "building",
                type: "type-3",  // 从type-2改为type-3，绿色
                features: ["企业专享，定制省心", "一企一策，降本增效", "全程陪伴，省力省时", "稳定连接，助力增长"],
                link: "https://hk.xuanhaoka.com/apps/zq/11708",
                buttonText: "查看方案"
            }
        ]
    };
    
    // ==================== 状态管理 ====================
    const State = {
        lastFocusedElement: null,
        isWechat: null,
        isIOS: null,
        isAndroid: null,
        isPC: null,
        isProcessing: false,
        guidanceExpanded: true
    };
    
    // ==================== 工具函数 ====================
    
    /**
     * 环境检测
     */
    function detectEnvironment() {
        const ua = navigator.userAgent.toLowerCase();
        
        State.isWechat = /micromessenger/i.test(ua);
        State.isIOS = /iphone|ipad|ipod/i.test(ua);
        State.isAndroid = /android/i.test(ua);
        State.isPC = !State.isIOS && !State.isAndroid;
    }
    
    /**
     * 显示Toast消息
     */
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastFadeOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    /**
     * 复制文本到剪贴板
     */
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('复制失败:', err);
            return false;
        }
    }
    
    /**
     * 设置按钮处理状态
     */
    function setButtonProcessing(button, isProcessing) {
        if (isProcessing) {
            button.classList.add('processing');
            button.disabled = true;
        } else {
            button.classList.remove('processing');
            button.disabled = false;
        }
    }
    
    // ==================== 微信功能模块 ====================
    
    const WechatService = {
        /**
         * 显示微信客服模态框
         */
        showModal() {
            const modal = document.getElementById('wechatModal');
            if (!modal) return;
            
            State.lastFocusedElement = document.activeElement;
            
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-modal', 'true');
            document.body.style.overflow = 'hidden';
            
            this.updateWechatIdDisplay();
            this.showEnvironmentHint();
            
            setTimeout(() => {
                const copyBtn = document.getElementById('copyWechatBtn');
                if (copyBtn) copyBtn.focus();
            }, 100);
            
            this.toggleGuidance(true);
        },
        
        /**
         * 隐藏模态框
         */
        hideModal() {
            const modal = document.getElementById('wechatModal');
            if (!modal) return;
            
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            document.body.style.overflow = '';
            
            if (State.lastFocusedElement) {
                State.lastFocusedElement.focus();
            }
            
            State.isProcessing = false;
        },
        
        /**
         * 更新微信号显示
         */
        updateWechatIdDisplay() {
            const displayEl = document.getElementById('displayWechatId');
            const copyStatus = document.getElementById('copyStatus');
            
            if (displayEl) {
                displayEl.textContent = CONFIG.WECHAT_ID;
                displayEl.classList.remove('copied');
            }
            
            if (copyStatus) {
                copyStatus.textContent = '';
            }
        },
        
        /**
         * 显示环境智能提示
         */
        showEnvironmentHint() {
            const hintEl = document.getElementById('environmentHint');
            if (!hintEl) return;
            
            let hint = '';
            
            if (State.isWechat) {
                hint = `
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <strong>✅ 您已在微信内</strong>
                        <p>长按二维码识别或复制微信号搜索添加</p>
                    </div>
                `;
            } else if (State.isIOS) {
                hint = `
                    <i class="fab fa-apple"></i>
                    <div>
                        <strong>📱 iPhone用户</strong>
                        <p>复制后点击"打开微信"可自动跳转</p>
                    </div>
                `;
            } else if (State.isAndroid) {
                hint = `
                    <i class="fab fa-android"></i>
                    <div>
                        <strong>📱 安卓用户</strong>
                        <p>复制后点击"打开微信"尝试跳转</p>
                    </div>
                `;
            } else {
                hint = `
                    <i class="fas fa-desktop"></i>
                    <div>
                        <strong>💻 电脑端用户</strong>
                        <p>请使用手机微信扫描二维码</p>
                    </div>
                `;
            }
            
            hintEl.innerHTML = hint;
        },
        
        /**
         * 切换指引显示
         */
        toggleGuidance(forceExpand) {
            const guidanceContent = document.getElementById('guidanceContent');
            const toggleBtn = document.getElementById('toggleGuidance');
            
            if (forceExpand !== undefined) {
                State.guidanceExpanded = forceExpand;
            } else {
                State.guidanceExpanded = !State.guidanceExpanded;
            }
            
            if (guidanceContent) {
                if (State.guidanceExpanded) {
                    guidanceContent.style.display = 'block';
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        toggleBtn.classList.add('active');
                    }
                } else {
                    guidanceContent.style.display = 'none';
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                        toggleBtn.classList.remove('active');
                    }
                }
            }
        },
        
        /**
         * 复制微信号
         */
        async copyWechatId() {
            if (State.isProcessing) return;
            
            const copyBtn = document.getElementById('copyWechatBtn');
            const displayEl = document.getElementById('displayWechatId');
            const copyStatus = document.getElementById('copyStatus');
            
            try {
                State.isProcessing = true;
                if (copyBtn) setButtonProcessing(copyBtn, true);
                
                const success = await copyToClipboard(CONFIG.WECHAT_ID);
                
                if (success) {
                    if (displayEl) displayEl.classList.add('copied');
                    
                    if (copyStatus) {
                        copyStatus.textContent = '已复制到剪贴板';
                        copyStatus.style.color = 'var(--success)';
                    }
                    
                    showToast('微信号已复制到剪贴板', 'success');
                    
                    setTimeout(() => {
                        if (displayEl) displayEl.classList.remove('copied');
                        if (copyStatus) copyStatus.textContent = '';
                    }, 2000);
                } else {
                    showToast('复制失败，请手动复制微信号', 'error');
                }
            } catch (error) {
                console.error('复制微信号失败:', error);
                showToast('操作失败，请手动复制微信号', 'error');
            } finally {
                State.isProcessing = false;
                if (copyBtn) setButtonProcessing(copyBtn, false);
            }
        },
        
        /**
         * 打开微信
         */
        async openWechat() {
            if (State.isProcessing) return;
            
            const openBtn = document.getElementById('openWechatBtn');
            
            try {
                State.isProcessing = true;
                if (openBtn) setButtonProcessing(openBtn, true);
                
                const startTime = Date.now();
                
                if (State.isWechat) {
                    showToast('已在微信中，请直接搜索添加', 'info');
                    return;
                }
                
                let opened = false;
                
                try {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = CONFIG.WECHAT_SCHEME;
                    document.body.appendChild(iframe);
                    
                    setTimeout(() => {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                    }, 100);
                    
                    opened = true;
                } catch (e) {
                    console.warn('iframe方式唤醒失败:', e);
                }
                
                if (!opened) {
                    try {
                        window.location.href = CONFIG.WECHAT_SCHEME;
                        opened = true;
                    } catch (e) {
                        console.warn('location方式唤醒失败:', e);
                    }
                }
                
                setTimeout(() => {
                    const elapsed = Date.now() - startTime;
                    
                    if (document.hidden) return;
                    
                    if (elapsed > CONFIG.CHECK_TIMEOUT) {
                        this.showJumpFailHint();
                    }
                }, CONFIG.CHECK_TIMEOUT + 100);
                
                setTimeout(() => {
                    if (!document.hidden && State.isProcessing) {
                        this.showJumpFailHint();
                    }
                }, CONFIG.CHECK_TIMEOUT + 500);
                
            } catch (error) {
                console.error('打开微信失败:', error);
                this.showJumpFailHint();
            } finally {
                setTimeout(() => {
                    State.isProcessing = false;
                    if (openBtn) setButtonProcessing(openBtn, false);
                }, 2000);
            }
        },
        
        /**
         * 显示跳转失败提示
         */
        showJumpFailHint() {
            if (State.isWechat) {
                showToast('已在微信中，请直接搜索添加', 'info');
            } else if (State.isPC) {
                showToast('电脑端请使用手机微信扫码添加', 'info');
            } else {
                showToast('如未自动跳转，请手动打开微信搜索添加', 'warning');
            }
        },
        
        /**
         * 初始化微信功能
         */
        init() {
            const wechatFloat = document.getElementById('wechatFloat');
            const copyBtn = document.getElementById('copyWechatBtn');
            const openBtn = document.getElementById('openWechatBtn');
            const closeBtn = document.getElementById('closeWechatModal');
            const toggleBtn = document.getElementById('toggleGuidance');
            const modal = document.getElementById('wechatModal');
            
            if (wechatFloat) {
                wechatFloat.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showModal();
                });
                
                wechatFloat.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showModal();
                    }
                });
            }
            
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyWechatId());
            }
            
            if (openBtn) {
                openBtn.addEventListener('click', () => this.openWechat());
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideModal());
            }
            
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggleGuidance());
            }
            
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.target.getAttribute('data-tab');
                    this.switchGuidanceTab(tab);
                });
            });
            
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal();
                    }
                });
                
                modal.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.hideModal();
                    }
                });
            }
        },
        
        /**
         * 切换指引标签
         */
        switchGuidanceTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            
            const activeContent = document.getElementById(`${tab}Tab`);
            if (activeContent) activeContent.classList.add('active');
        }
    };
    
    // ==================== 平台卡片模块 ====================
    
    const PlatformService = {
        /**
         * 显示骨架屏
         */
        showSkeleton() {
            const container = document.getElementById('platformsContainer');
            if (!container) return;
            
            const skeletonHTML = `
                <div class="platform-card">
                    <div class="skeleton skeleton-header"></div>
                    <div class="platform-body">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-button"></div>
                    </div>
                </div>
            `;
            
            let skeleton = '';
            for (let i = 0; i < CONFIG.PLATFORMS.length; i++) {
                skeleton += skeletonHTML;
            }
            
            container.innerHTML = skeleton;
        },
        
        /**
         * 渲染平台卡片
         */
        renderPlatforms() {
            const container = document.getElementById('platformsContainer');
            if (!container) return;
            
            try {
                let html = '';
                
                CONFIG.PLATFORMS.forEach(platform => {
                    html += `
                        <div class="platform-card" data-id="${platform.id}">
                            <div class="platform-header ${platform.type}">
                                <div class="platform-icon" aria-hidden="true">
                                    <i class="fas fa-${platform.icon}"></i>
                                </div>
                                <h3>${platform.title}</h3>
                                <div class="platform-tag">${platform.tag}</div>
                            </div>
                            <div class="platform-body">
                                <ul class="platform-features">
                                    ${platform.features.map(feature => 
                                        `<li><i class="fas fa-check" aria-hidden="true"></i> ${feature}</li>`
                                    ).join('')}
                                </ul>
                                <a href="${platform.link}" target="_blank" class="platform-button" rel="noopener noreferrer" aria-label="${platform.buttonText} - ${platform.title}">
                                    ${platform.buttonText}
                                </a>
                            </div>
                        </div>
                    `;
                });
                
                container.innerHTML = html;
                
                const cards = container.querySelectorAll('.platform-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('loaded');
                    }, index * 100);
                });
                
            } catch (error) {
                console.error('渲染平台卡片时出错:', error);
                container.innerHTML = '<div class="error-message">加载失败，请刷新页面重试</div>';
            }
        },
        
        /**
         * 初始化平台卡片
         */
        init() {
            this.showSkeleton();
            
            setTimeout(() => {
                this.renderPlatforms();
            }, 500);
        }
    };
    
    // ==================== 模态框管理模块 ====================
    
    const ModalService = {
        /**
         * 初始化模态框
         */
        init() {
            const privacyBtn = document.getElementById('privacyBtn');
            const closePrivacyBtn = document.getElementById('closePrivacyModal');
            const privacyModal = document.getElementById('privacyModal');
            
            if (privacyBtn && privacyModal) {
                privacyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showModal('privacyModal');
                });
            }
            
            if (closePrivacyBtn && privacyModal) {
                closePrivacyBtn.addEventListener('click', () => {
                    this.hideModal('privacyModal');
                });
            }
            
            const agreementBtn = document.getElementById('agreementBtn');
            const closeAgreementBtn = document.getElementById('closeAgreementModal');
            const agreementModal = document.getElementById('agreementModal');
            
            if (agreementBtn && agreementModal) {
                agreementBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showModal('agreementModal');
                });
            }
            
            if (closeAgreementBtn && agreementModal) {
                closeAgreementBtn.addEventListener('click', () => {
                    this.hideModal('agreementModal');
                });
            }
            
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(modal.id);
                    }
                });
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal[style*="display: flex"]');
                    modals.forEach(modal => {
                        this.hideModal(modal.id);
                    });
                }
            });
        },
        
        /**
         * 显示模态框
         */
        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            
            State.lastFocusedElement = document.activeElement;
            
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-modal', 'true');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) firstFocusable.focus();
            }, 100);
        },
        
        /**
         * 隐藏模态框
         */
        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            document.body.style.overflow = '';
            
            if (State.lastFocusedElement) {
                State.lastFocusedElement.focus();
            }
        }
    };
    
    // ==================== 滚动动画模块 ====================
    
    const ScrollAnimation = {
        /**
         * 初始化滚动动画
         */
        init() {
            const elements = document.querySelectorAll('.fade-in');
            
            elements.forEach(element => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            });
            
            this.checkScroll();
            
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        this.checkScroll();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
            
            window.addEventListener('load', this.checkScroll.bind(this));
            window.addEventListener('resize', this.checkScroll.bind(this));
        },
        
        /**
         * 检查滚动位置
         */
        checkScroll() {
            const elements = document.querySelectorAll('.fade-in');
            const windowHeight = window.innerHeight;
            
            elements.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                
                if (elementTop < windowHeight - 50) {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }
            });
        }
    };
    
    // ==================== 外部链接处理 ====================
    
    function initExternalLinks() {
        document.querySelectorAll('a[target="_blank"]').forEach(link => {
            if (!link.hasAttribute('rel')) {
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('platform-button')) {
                e.target.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            }
        });
    }
    
    // ==================== 移动端优化 ====================
    
    function initMobileOptimization() {
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
    }
    
    // ==================== 错误处理 ====================
    
    function initErrorHandling() {
        window.addEventListener('error', function(e) {
            console.error('页面错误:', e.error);
        });
        
        window.addEventListener('unhandledrejection', function(e) {
            console.error('未处理的Promise错误:', e.reason);
            showToast('操作失败，请重试', 'error');
            e.preventDefault();
        });
    }
    
    // ==================== 主初始化函数 ====================
    
    /**
     * 初始化整个应用
     */
    function init() {
        console.log('号卡优选商城 - 初始化开始');
        
        detectEnvironment();
        initErrorHandling();
        initMobileOptimization();
        initExternalLinks();
        
        PlatformService.init();
        WechatService.init();
        ModalService.init();
        ScrollAnimation.init();
        
        console.log('号卡优选商城 - 初始化完成');
    }
    
    // ==================== 启动应用 ====================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            detectEnvironment();
        }
    });
    
})();
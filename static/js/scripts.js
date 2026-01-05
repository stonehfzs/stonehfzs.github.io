const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['index', 'about', 'awards', 'experience', 'notes', 'blog'];


window.addEventListener('DOMContentLoaded', event => {

    // Function to add copy buttons to code blocks
    function addCopyButtons(container) {
        if (!container) return;
        const preTags = container.querySelectorAll('pre');
        preTags.forEach(pre => {
            // Check if already wrapped
            if (pre.parentNode.classList.contains('code-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'code-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const button = document.createElement('button');
            button.className = 'copy-button';
            button.textContent = 'Copy';
            
            button.addEventListener('click', () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;
                
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    button.textContent = 'Error';
                });
            });
            
            wrapper.appendChild(button);
        });
    }

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Latest Blogs on Index
    const latestBlogsElement = document.getElementById('latest-blogs');
    if (latestBlogsElement) {
        fetch(content_dir + 'blog/sidebar.md')
            .then(response => response.text())
            .then(markdown => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = marked.parse(markdown);
                const links = Array.from(tempDiv.querySelectorAll('a')).slice(0, 2);
                
                if (links.length > 0) {
                    let html = '<h3 class="mb-4 fw-bold text-primary">Latest Blogs</h3><div class="list-group shadow-sm">';
                    links.forEach(link => {
                        const text = link.textContent;
                        const href = link.getAttribute('href');
                        const match = text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
                        let date = '';
                        let title = text;
                        if (match) {
                            date = match[1];
                            title = match[2];
                        }
                        
                        html += `
                            <a href="${href}" class="list-group-item list-group-item-action p-4 border-start-primary">
                                <div class="d-flex w-100 justify-content-between align-items-center">
                                    <h5 class="mb-1 fw-bold text-dark">${title}</h5>
                                    <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${date}</small>
                                </div>
                            </a>
                        `;
                    });
                    html += '</div>';
                    latestBlogsElement.innerHTML = html;
                }
            })
            .catch(error => console.log(error));
    }

    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        // Special handling for blog
        if (name === 'blog') {
            const sidebarElement = document.getElementById('blog-sidebar');
            const contentElement = document.getElementById('blog-content');
            
            if (sidebarElement && contentElement) {
                // Load Sidebar
                fetch(content_dir + 'blog/sidebar.md')
                    .then(response => response.text())
                    .then(markdown => {
                        sidebarElement.innerHTML = marked.parse(markdown);
                        addCopyButtons(sidebarElement);

                        // Format sidebar links
                        const links = sidebarElement.querySelectorAll('a');
                        links.forEach(link => {
                            const text = link.textContent;
                            // Match "YYYY-MM-DD: Title"
                            const match = text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
                            if (match) {
                                const date = match[1];
                                const title = match[2];
                                link.innerHTML = `
                                    <div class="d-flex flex-column">
                                        <span class="blog-title fw-bold">${title}</span>
                                        <span class="blog-date small text-muted mt-1"><i class="bi bi-calendar3 me-1"></i>${date}</span>
                                    </div>
                                `;
                            }
                        });

                        // Highlight active link
                        const urlParams = new URLSearchParams(window.location.search);
                        const currentPost = urlParams.get('post');
                        if (currentPost) {
                            links.forEach(link => {
                                if (link.getAttribute('href').includes('post=' + currentPost)) {
                                    link.classList.add('active');
                                }
                            });
                        }
                    });

                // Load Content
                const urlParams = new URLSearchParams(window.location.search);
                const post = urlParams.get('post');
                let filename = 'blog/index.md';
                if (post) {
                    filename = 'blog/' + post + '.md';
                }

                fetch(content_dir + filename)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.text();
                    })
                    .then(markdown => {
                        contentElement.innerHTML = marked.parse(markdown);
                        addCopyButtons(contentElement);

                        // Add Share Button
                        const shareDiv = document.createElement('div');
                        shareDiv.className = 'mt-5 pt-4 border-top';
                        
                        const shareBtn = document.createElement('button');
                        shareBtn.className = 'btn btn-outline-primary';
                        shareBtn.innerHTML = '<i class="bi bi-share-fill me-2"></i>Share this post';
                        
                        shareBtn.addEventListener('click', () => {
                            // Get title from the first h1, or use document title if not found
                            let title = document.title;
                            const h1 = contentElement.querySelector('h1');
                            if (h1) {
                                title = h1.innerText;
                            } else {
                                // Fallback: try to find title from sidebar active link
                                const activeLink = document.querySelector('#blog-sidebar a.active .blog-title');
                                if (activeLink) {
                                    title = activeLink.innerText;
                                }
                            }
                            
                            const url = window.location.href;
                            const textToCopy = `${title}\n${url}`;
                            
                            navigator.clipboard.writeText(textToCopy).then(() => {
                                const originalHtml = shareBtn.innerHTML;
                                shareBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Copied!';
                                shareBtn.classList.replace('btn-outline-primary', 'btn-success');
                                
                                setTimeout(() => {
                                    shareBtn.innerHTML = originalHtml;
                                    shareBtn.classList.replace('btn-success', 'btn-outline-primary');
                                }, 2000);
                            }).catch(err => {
                                console.error('Failed to copy:', err);
                            });
                        });
                        
                        shareDiv.appendChild(shareBtn);
                        contentElement.appendChild(shareDiv);
                    })
                    .then(() => MathJax.typeset())
                    .catch(error => console.log(error));
            }
            return; // Skip default logic for blog
        }

        const element = document.getElementById(name + '-md');
        if (element) {
            let filename = name + '.md';
            fetch(content_dir + filename)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(markdown => {
                    const html = marked.parse(markdown);
                    element.innerHTML = html;
                    addCopyButtons(element);
                }).then(() => {
                    // MathJax
                    MathJax.typeset();
                })
                .catch(error => console.log(error));
        }
    })

}); 

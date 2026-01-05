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

                        // Highlight active link
                        const urlParams = new URLSearchParams(window.location.search);
                        const currentPost = urlParams.get('post');
                        if (currentPost) {
                            const links = sidebarElement.querySelectorAll('a');
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

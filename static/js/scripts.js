const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['index', 'about', 'awards', 'experience', 'notes', 'blog'];


window.addEventListener('DOMContentLoaded', event => {

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
                }).then(() => {
                    // MathJax
                    MathJax.typeset();
                })
                .catch(error => console.log(error));
        }
    })

}); 

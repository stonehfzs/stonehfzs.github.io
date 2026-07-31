const contentDir = 'contents/';
const configFile = 'config.yml';
const sectionNames = ['index', 'about', 'awards', 'experience', 'notes'];

window.addEventListener('DOMContentLoaded', () => {
    marked.use({ mangle: false, headerIds: false });

    const escapeHtml = value => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const fetchText = async path => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
        return response.text();
    };

    function addCopyButtons(container) {
        if (!container) return;
        container.querySelectorAll('pre').forEach(pre => {
            if (pre.parentNode.classList.contains('code-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'code-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const button = document.createElement('button');
            button.className = 'copy-button';
            button.type = 'button';
            button.textContent = 'Copy';
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(pre.querySelector('code')?.innerText || pre.innerText);
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
                } catch (error) {
                    console.error('Failed to copy:', error);
                    button.textContent = 'Error';
                }
            });
            wrapper.appendChild(button);
        });
    }

    function parsePost(markdown, slug) {
        const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
        let metadata = {};
        let body = markdown;
        if (match) {
            metadata = jsyaml.load(match[1]) || {};
            body = markdown.slice(match[0].length);
        }

        const heading = body.match(/^#\s+(.+)$/m);
        const rawDate = metadata.date instanceof Date
            ? metadata.date.toISOString().slice(0, 10)
            : String(metadata.date || slug);

        return {
            slug,
            title: String(metadata.title || heading?.[1] || slug),
            date: rawDate,
            category: String(metadata.category || 'uncategorized'),
            description: String(metadata.description || ''),
            body
        };
    }

    let blogLibraryPromise;
    function loadBlogLibrary() {
        if (!blogLibraryPromise) {
            blogLibraryPromise = fetchText(contentDir + 'blog/categories.yml')
                .then(text => jsyaml.load(text) || {})
                .then(async config => {
                    const categories = Array.isArray(config.categories) ? config.categories : [];
                    const slugs = Array.isArray(config.posts) ? config.posts.map(String) : [];
                    const results = await Promise.allSettled(slugs.map(async slug =>
                        parsePost(await fetchText(`${contentDir}blog/${slug}.md`), slug)
                    ));
                    const posts = results
                        .filter(result => result.status === 'fulfilled')
                        .map(result => result.value)
                        .sort((a, b) => b.date.localeCompare(a.date));
                    results.filter(result => result.status === 'rejected')
                        .forEach(result => console.error(result.reason));
                    return { categories, posts, defaultCategory: String(config.default_category || 'all') };
                });
        }
        return blogLibraryPromise;
    }

    const getCategory = (categories, id) => categories.find(category => String(category.id) === id);

    function categoryBadge(category) {
        if (!category) return '';
        return `<span class="post-category" style="--category-color:${escapeHtml(category.color || '#6d5dfc')}">
            <i class="bi ${escapeHtml(category.icon || 'bi-folder')}"></i>${escapeHtml(category.name)}
        </span>`;
    }

    function renderSidebar(element, library, selectedCategory, activePost) {
        const { categories, posts } = library;
        const categoryItems = [{ id: 'all', name: 'All posts', icon: 'bi-grid', color: '#6d5dfc' }, ...categories];
        element.innerHTML = `
            <div class="sidebar-panel">
                <div class="sidebar-label">Explore</div>
                <nav class="category-list">
                    ${categoryItems.map(category => {
                        const id = String(category.id);
                        const count = id === 'all' ? posts.length : posts.filter(post => post.category === id).length;
                        return `<a class="category-link ${selectedCategory === id ? 'active' : ''}"
                            href="blog.html${id === 'all' ? '' : `?category=${encodeURIComponent(id)}`}"
                            style="--category-color:${escapeHtml(category.color || '#6d5dfc')}">
                            <span><i class="bi ${escapeHtml(category.icon || 'bi-folder')}"></i>${escapeHtml(category.name)}</span>
                            <strong>${count}</strong>
                        </a>`;
                    }).join('')}
                </nav>
            </div>
            <div class="sidebar-panel recent-panel">
                <div class="sidebar-label">Recent entries</div>
                <nav class="recent-list">
                    ${posts.slice(0, 5).map(post => `<a href="blog.html?post=${encodeURIComponent(post.slug)}"
                        title="${escapeHtml(post.title)}"
                        class="recent-link ${activePost === post.slug ? 'active' : ''}">
                        <span>${escapeHtml(post.title)}</span><time>${escapeHtml(post.date)}</time>
                    </a>`).join('')}
                </nav>
            </div>`;
    }

    function renderArchive(element, library, selectedCategory) {
        const category = selectedCategory === 'all' ? null : getCategory(library.categories, selectedCategory);
        const posts = selectedCategory === 'all'
            ? library.posts
            : library.posts.filter(post => post.category === selectedCategory);
        const title = category?.name || 'All posts';
        const description = category?.description || 'Browse the complete collection, organized by topic.';

        element.innerHTML = `
            <section class="archive-hero">
                <div>
                    <span class="archive-kicker">${category ? 'CATEGORY' : 'BLOG ARCHIVE'}</span>
                    <h1>${escapeHtml(title)}</h1>
                    <p>${escapeHtml(description)}</p>
                </div>
                <div class="archive-count"><strong>${posts.length}</strong><span>${posts.length === 1 ? 'article' : 'articles'}</span></div>
            </section>
            <div class="post-grid">
                ${posts.length ? posts.map(post => {
                    const postCategory = getCategory(library.categories, post.category);
                    return `<article class="post-card">
                        <div class="post-card-meta">${categoryBadge(postCategory)}<time>${escapeHtml(post.date)}</time></div>
                        <h2><a href="blog.html?post=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2>
                        <p>${escapeHtml(post.description || 'Open this entry to continue reading.')}</p>
                        <a class="post-read-more" href="blog.html?post=${encodeURIComponent(post.slug)}">Read article <i class="bi bi-arrow-up-right"></i></a>
                    </article>`;
                }).join('') : '<div class="blog-empty"><i class="bi bi-inbox"></i><h2>No posts yet</h2><p>This category is ready for its first entry.</p></div>'}
            </div>`;
    }

    function addShareButton(element, post) {
        const share = document.createElement('div');
        share.className = 'article-actions';
        const button = document.createElement('button');
        button.className = 'share-button';
        button.type = 'button';
        button.innerHTML = '<i class="bi bi-share"></i><span>Share article</span>';
        button.addEventListener('click', async () => {
            try {
                if (navigator.share) {
                    await navigator.share({ title: post.title, url: window.location.href });
                } else {
                    await navigator.clipboard.writeText(`${post.title}\n${window.location.href}`);
                    button.innerHTML = '<i class="bi bi-check2"></i><span>Link copied</span>';
                    setTimeout(() => { button.innerHTML = '<i class="bi bi-share"></i><span>Share article</span>'; }, 2000);
                }
            } catch (error) {
                if (error.name !== 'AbortError') console.error('Failed to share:', error);
            }
        });
        share.appendChild(button);
        element.appendChild(share);
    }

    async function renderBlog() {
        const sidebar = document.getElementById('blog-sidebar');
        const content = document.getElementById('blog-content');
        if (!sidebar || !content) return;

        try {
            const library = await loadBlogLibrary();
            const params = new URLSearchParams(window.location.search);
            const postSlug = params.get('post');
            const requestedCategory = params.get('category') || library.defaultCategory;
            const validCategory = requestedCategory === 'all' || getCategory(library.categories, requestedCategory);
            const selectedCategory = validCategory ? requestedCategory : 'all';
            const post = postSlug ? library.posts.find(item => item.slug === postSlug) : null;

            renderSidebar(sidebar, library, post ? post.category : selectedCategory, post?.slug);
            if (postSlug && !post) {
                content.innerHTML = '<div class="blog-empty"><i class="bi bi-exclamation-diamond"></i><h1>Post not found</h1><p>The requested article is not listed in the blog configuration.</p><a href="blog.html">Return to the archive</a></div>';
                return;
            }
            if (!post) {
                renderArchive(content, library, selectedCategory);
                return;
            }

            const category = getCategory(library.categories, post.category);
            content.innerHTML = `<article class="blog-article">
                <a class="article-back" href="blog.html${category ? `?category=${encodeURIComponent(post.category)}` : ''}"><i class="bi bi-arrow-left"></i> Back to ${escapeHtml(category?.name || 'all posts')}</a>
                <header class="article-header">
                    <div class="article-meta">${categoryBadge(category)}<time><i class="bi bi-calendar3"></i>${escapeHtml(post.date)}</time></div>
                    <h1>${escapeHtml(post.title)}</h1>
                    ${post.description ? `<p>${escapeHtml(post.description)}</p>` : ''}
                </header>
                <div class="article-body">${marked.parse(post.body)}</div>
            </article>`;
            addCopyButtons(content);
            addShareButton(content.querySelector('.blog-article'), post);
            document.title = `${post.title} · Blog`;
            if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([content]);
        } catch (error) {
            console.error(error);
            sidebar.innerHTML = '';
            content.innerHTML = '<div class="blog-empty"><i class="bi bi-wifi-off"></i><h1>Unable to load the blog</h1><p>Please refresh the page or try again later.</p></div>';
        }
    }

    async function renderLatestBlogs() {
        const element = document.getElementById('latest-blogs');
        if (!element) return;
        try {
            const library = await loadBlogLibrary();
            const posts = library.posts.slice(0, 2);
            if (!posts.length) return;
            element.innerHTML = `<h3 class="mb-4 fw-bold text-primary">Latest Blogs</h3><div class="list-group shadow-sm">
                ${posts.map(post => `<a href="blog.html?post=${encodeURIComponent(post.slug)}" class="list-group-item list-group-item-action p-4 border-start-primary">
                    <div class="d-flex w-100 justify-content-between align-items-center gap-3">
                        <h5 class="mb-1 fw-bold text-dark">${escapeHtml(post.title)}</h5>
                        <small class="text-muted text-nowrap"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(post.date)}</small>
                    </div>
                </a>`).join('')}
            </div>`;
        } catch (error) {
            console.error(error);
        }
    }

    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) new bootstrap.ScrollSpy(document.body, { target: '#mainNav', offset: 74 });

    fetch(contentDir + configFile)
        .then(response => response.text())
        .then(text => {
            const config = jsyaml.load(text);
            Object.keys(config).forEach(key => {
                const element = document.getElementById(key);
                if (element) element.innerHTML = config[key];
            });
        })
        .catch(error => console.error(error));

    sectionNames.forEach(name => {
        const element = document.getElementById(name + '-md');
        if (!element) return;
        fetchText(contentDir + name + '.md')
            .then(markdown => {
                element.innerHTML = marked.parse(markdown);
                addCopyButtons(element);
                if (window.MathJax?.typesetPromise) return MathJax.typesetPromise([element]);
            })
            .catch(error => console.error(error));
    });

    renderLatestBlogs();
    renderBlog();
});

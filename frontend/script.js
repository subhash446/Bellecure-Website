const API_BASE = window.BELLECURE_API_BASE || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.origin);

document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        const mobileLinks = mobileMenu.querySelectorAll('a, button');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // --- Admin login modal ---
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const mobileAdminLoginBtn = document.getElementById('mobileAdminLoginBtn');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const closeAdminLoginModal = document.getElementById('closeAdminLoginModal');
    const adminEmailInput = document.getElementById('adminEmail');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginSubmit = document.getElementById('adminLoginSubmit');
    const adminLoginError = document.getElementById('adminLoginError');

    const openAdminLoginModal = () => {
        if (!adminLoginModal) return;
        adminLoginModal.classList.remove('hidden');
        adminLoginModal.classList.add('flex');
        setTimeout(() => adminEmailInput?.focus(), 50);
    };

    const closeAdminLoginModalFn = () => {
        if (!adminLoginModal) return;
        adminLoginModal.classList.add('hidden');
        adminLoginModal.classList.remove('flex');
        if (adminEmailInput) adminEmailInput.value = '';
        if (adminPasswordInput) adminPasswordInput.value = '';
        if (adminLoginError) {
            adminLoginError.classList.add('hidden');
            adminLoginError.textContent = '';
        }
    };

    [adminLoginBtn, mobileAdminLoginBtn].forEach((button) => {
        if (button) button.addEventListener('click', openAdminLoginModal);
    });

    if (closeAdminLoginModal) closeAdminLoginModal.addEventListener('click', closeAdminLoginModalFn);

    if (adminLoginModal) {
        adminLoginModal.addEventListener('click', (event) => {
            if (event.target === adminLoginModal) closeAdminLoginModalFn();
        });
    }

    const handleAdminLogin = async () => {
        if (!adminEmailInput || !adminPasswordInput || !adminLoginSubmit) return;

        const email = adminEmailInput.value.trim();
        const password = adminPasswordInput.value.trim();

        if (!email || !password) {
            if (adminLoginError) {
                adminLoginError.textContent = 'Please enter both your admin email and password.';
                adminLoginError.classList.remove('hidden');
            }
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (adminLoginError) {
                    adminLoginError.textContent = data.message || 'Invalid admin email or password.';
                    adminLoginError.classList.remove('hidden');
                }
                return;
            }

            localStorage.setItem('bellecure-admin-email', email);
            localStorage.setItem('bellecure-admin-key', password);
            closeAdminLoginModalFn();
            window.location.href = '/admin.html';
        } catch (error) {
            if (adminLoginError) {
                adminLoginError.textContent = 'Unable to connect to the server.';
                adminLoginError.classList.remove('hidden');
            }
        }
    };

    if (adminLoginSubmit) adminLoginSubmit.addEventListener('click', handleAdminLogin);
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') handleAdminLogin();
        });
    }
    if (adminEmailInput) {
        adminEmailInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') handleAdminLogin();
        });
    }

    // --- Sticky Navbar Styling ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navbar.classList.add('shadow-md', 'bg-white/95');
                navbar.classList.remove('bg-white/90');
            } else {
                navbar.classList.remove('shadow-md', 'bg-white/95');
                navbar.classList.add('bg-white/90');
            }
        });
    }

    // --- Intersection Observer for Scroll Animations ---
    const fadeElements = document.querySelectorAll('.fade-in-up');
    if (fadeElements.length > 0) {
        const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
        const scrollObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        fadeElements.forEach(element => scrollObserver.observe(element));
    }

    // --- Review Carousel ---
    const reviewCards = Array.from(document.querySelectorAll('[data-review-card]'));
    const reviewDots = Array.from(document.querySelectorAll('[data-review-dot]'));
    const reviewPrev = document.querySelector('[data-review-prev]');
    const reviewNext = document.querySelector('[data-review-next]');
    let activeReview = 0;
    let reviewTimer;

    const showReview = (index) => {
        if (!reviewCards.length) return;

        activeReview = (index + reviewCards.length) % reviewCards.length;

        reviewCards.forEach((card, cardIndex) => {
            card.classList.toggle('hidden', cardIndex !== activeReview);
        });

        reviewDots.forEach((dot, dotIndex) => {
            dot.classList.toggle('bg-brand-red', dotIndex === activeReview);
            dot.classList.toggle('bg-gray-300', dotIndex !== activeReview);
        });
    };

    const startReviewRotation = () => {
        if (reviewTimer) clearInterval(reviewTimer);
        reviewTimer = setInterval(() => {
            showReview(activeReview + 1);
        }, 6000);
    };

    if (reviewCards.length) {
        showReview(0);
        startReviewRotation();

        reviewDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showReview(index);
                startReviewRotation();
            });
        });

        if (reviewPrev) {
            reviewPrev.addEventListener('click', () => {
                showReview(activeReview - 1);
                startReviewRotation();
            });
        }

        if (reviewNext) {
            reviewNext.addEventListener('click', () => {
                showReview(activeReview + 1);
                startReviewRotation();
            });
        }

        const reviewCarousel = document.getElementById('reviewCarousel');
        if (reviewCarousel) {
            let touchStartX = 0;
            reviewCarousel.addEventListener('touchstart', (event) => {
                touchStartX = event.touches[0].clientX;
            }, { passive: true });

            reviewCarousel.addEventListener('touchend', (event) => {
                const touchEndX = event.changedTouches[0].clientX;
                const delta = touchEndX - touchStartX;

                if (delta > 50) {
                    showReview(activeReview - 1);
                } else if (delta < -50) {
                    showReview(activeReview + 1);
                }

                startReviewRotation();
            }, { passive: true });
        }
    }

    // --- Floating Assistant ---
    const assistantToggle = document.getElementById('assistantToggle');
    const assistantPanel = document.getElementById('assistantPanel');
    const assistantClose = document.getElementById('assistantClose');
    const assistantInput = document.getElementById('assistantInput');
    const assistantSend = document.getElementById('assistantSend');
    const assistantMessages = document.getElementById('assistantMessages');

    if (assistantToggle && assistantPanel && assistantInput && assistantSend && assistantMessages) {
        const setAssistantOpen = (isOpen) => {
            assistantPanel.classList.toggle('hidden', !isOpen);
            assistantPanel.classList.toggle('is-visible', isOpen);
            assistantToggle.classList.toggle('hidden', isOpen);
            if (isOpen) {
                assistantInput.focus();
            }
        };

        const formatAssistantMarkdown = (text) => {
            const escapeHtml = (value) => value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const formatInline = (value) => escapeHtml(value)
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');

            const lines = text.replace(/\r\n/g, '\n').split('\n');
            let html = '';
            let paragraphLines = [];
            let listItems = [];

            const flushParagraph = () => {
                if (!paragraphLines.length) return;
                const content = paragraphLines.join(' ').trim();
                if (content) {
                    html += `<p>${formatInline(content)}</p>`;
                }
                paragraphLines = [];
            };

            const flushList = () => {
                if (!listItems.length) return;
                html += `<ul>${listItems.map((item) => `<li>${formatInline(item)}</li>`).join('')}</ul>`;
                listItems = [];
            };

            lines.forEach((rawLine) => {
                const line = rawLine.trim();

                if (!line) {
                    flushParagraph();
                    flushList();
                    return;
                }

                if (/^[-*]\s+/.test(line)) {
                    flushParagraph();
                    listItems.push(line.replace(/^[-*]\s+/, ''));
                    return;
                }

                flushList();
                paragraphLines.push(line);
            });

            flushParagraph();
            flushList();

            return html;
        };

        const addAssistantMessage = (text, role = 'bot') => {
            const messageWrapper = document.createElement('div');
            const classes = role === 'user'
                ? 'ml-auto bg-brand-red text-white rounded-lg p-3 text-sm shadow-sm max-w-[85%]'
                : 'mr-auto bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 shadow-sm max-w-[85%]';
            messageWrapper.className = classes;

            if (role === 'bot') {
                messageWrapper.innerHTML = formatAssistantMarkdown(text);
            } else {
                messageWrapper.textContent = text;
            }

            assistantMessages.appendChild(messageWrapper);
            assistantMessages.scrollTop = assistantMessages.scrollHeight;
        };

        const addThinkingIndicator = () => {
            const indicator = document.createElement('div');
            indicator.className = 'assistant-thinking';
            indicator.setAttribute('data-thinking-indicator', 'true');
            indicator.innerHTML = '<span></span><span></span><span></span>';
            assistantMessages.appendChild(indicator);
            assistantMessages.scrollTop = assistantMessages.scrollHeight;
            return indicator;
        };

        const removeThinkingIndicator = () => {
            const indicator = assistantMessages.querySelector('[data-thinking-indicator="true"]');
            if (indicator) {
                indicator.remove();
            }
        };

        const sendAssistantMessage = async () => {
            const message = assistantInput.value.trim();
            if (!message) return;

            addAssistantMessage(message, 'user');
            assistantInput.value = '';
            assistantSend.disabled = true;
            assistantSend.classList.add('opacity-70');

            const thinkingIndicator = addThinkingIndicator();

            try {
                const response = await fetch(`${API_BASE}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                const reply = data.reply || 'Sorry, I could not respond right now.';
                removeThinkingIndicator();
                addAssistantMessage(reply, 'bot');
            } catch (error) {
                removeThinkingIndicator();
                addAssistantMessage('Sorry, the assistant is unavailable right now. Please try again later.', 'bot');
            } finally {
                assistantSend.disabled = false;
                assistantSend.classList.remove('opacity-70');
                assistantInput.focus();
            }
        };

        assistantToggle.addEventListener('click', () => {
            const isOpen = assistantPanel.classList.contains('hidden');
            setAssistantOpen(isOpen);
        });

        assistantClose.addEventListener('click', () => {
            setAssistantOpen(false);
        });

        assistantSend.addEventListener('click', sendAssistantMessage);
        assistantInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendAssistantMessage();
            }
        });
    }

    // --- Contact Form Submission ---
    const distributorForm = document.getElementById('distributorForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitIcon = document.getElementById('submitIcon');
    const formMessage = document.getElementById('formMessage');
    const stateInput = document.getElementById('state');
    const districtInput = document.getElementById('district');

    const districtOptionsByState = {
        'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
        'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Subansiri', 'Namsai', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
        'Assam': ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup Metropolitan', 'Kamrup Rural', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
        Bihar: ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
        'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'],
        Gujarat: ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
        Haryana: ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
        'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
        Karnataka: ['Bagalkot', 'Bangalore Rural', 'Bengaluru Urban', 'Belagavi', 'Ballari', 'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'],
        Kerala: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
        'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
        Maharashtra: ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
        'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Debagarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundergarh'],
        'Rajasthan': ['Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara', 'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bosir', 'Chittorgarh', 'Churu', 'Dausa', 'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu', 'Ganganagar', 'Gangapur City', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Khairthal-Tijara', 'Kota', 'Nagaur', 'Pali', 'Phalodi', 'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
        'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
        'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagitial', 'Jangoan', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Nagarkurnool', 'Nalgonda', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'],
        'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharth Nagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
        'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
        Delhi: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
        'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
        'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran'],
        'Mizoram': ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
        'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
        'Nagaland': ['Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Shamator', 'Tseminyü', 'Tuensang', 'Wokha', 'Zünheboto'],
        'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'South Tripura', 'West Tripura'],
        'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
        'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
        'Goa': ['North Goa', 'South Goa'],
        'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
        'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum']
    };

    const updateDistrictOptions = () => {
        const selectedState = stateInput.value;
        const options = districtOptionsByState[selectedState] || [];
        districtInput.innerHTML = '<option value="" selected disabled>Select your district</option>';

        if (!selectedState) {
            districtInput.disabled = true;
            districtInput.classList.add('bg-gray-100', 'text-gray-500');
            districtInput.classList.remove('bg-white', 'text-gray-900');
            return;
        }

        districtInput.disabled = false;
        districtInput.classList.remove('bg-gray-100', 'text-gray-500');
        districtInput.classList.add('bg-white', 'text-gray-900');

        options.forEach((district) => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtInput.appendChild(option);
        });
    };

    if (stateInput) {
        stateInput.addEventListener('change', updateDistrictOptions);
        updateDistrictOptions();
    }

    // Modal Elements for Success Popup
    const successModal = document.getElementById('successModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const showModal = () => {
        successModal.classList.remove('hidden');
        setTimeout(() => {
            modalOverlay.classList.remove('opacity-0');
            modalContent.classList.remove('opacity-0', 'scale-95');
            modalContent.classList.add('opacity-100', 'scale-100');
        }, 10);
    };

    const closeModal = () => {
        modalOverlay.classList.add('opacity-0');
        modalContent.classList.remove('opacity-100', 'scale-100');
        modalContent.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            successModal.classList.add('hidden');
        }, 300);
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    if (distributorForm) {
        const nameInput = document.getElementById('from_name');
        const phoneInput = document.getElementById('phone_number');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const districtInput = document.getElementById('district');
        const businessInput = document.getElementById('business_type');

        const setFieldState = (input, isValid, message) => {
            input.classList.toggle('border-red-400', !isValid);
            input.classList.toggle('focus:ring-red-400', !isValid);
            input.setAttribute('aria-invalid', String(!isValid));
            if (!isValid && message) {
                formMessage.textContent = message;
                formMessage.className = 'p-3 rounded-md text-sm font-medium text-center bg-red-100 text-red-800 mt-4';
                formMessage.classList.remove('hidden');
            }
        };

        const validateDistributorForm = () => {
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const city = cityInput.value.trim();
            const state = stateInput.value;
            const district = districtInput.value;
            const business = businessInput.value;

            if (name.length < 2) {
                setFieldState(nameInput, false, 'Please enter your full name.');
                return false;
            }
            setFieldState(nameInput, true);

            const phonePattern = /^[+]?[(]?[0-9]{1,4}[)]?[-\s0-9]{7,15}$/;
            if (!phonePattern.test(phone) || phone.replace(/\D/g, '').length < 10) {
                setFieldState(phoneInput, false, 'Please enter a valid Mobile Number.');
                return false;
            }
            setFieldState(phoneInput, true);

            if (city.length < 2) {
                setFieldState(cityInput, false, 'Please enter your city or pin code.');
                return false;
            }
            setFieldState(cityInput, true);

            if (!state) {
                setFieldState(stateInput, false, 'Please select your state.');
                return false;
            }
            setFieldState(stateInput, true);

            if (!district) {
                setFieldState(districtInput, false, 'Please select your district.');
                return false;
            }
            setFieldState(districtInput, true);

            if (!business) {
                setFieldState(businessInput, false, 'Please select your business type.');
                return false;
            }
            setFieldState(businessInput, true);

            formMessage.classList.add('hidden');
            return true;
        };

        [nameInput, phoneInput, cityInput, stateInput, districtInput, businessInput].forEach((input) => {
            input.addEventListener('input', () => {
                if (input.value.trim() !== '') {
                    input.classList.remove('border-red-400', 'focus:ring-red-400');
                    input.setAttribute('aria-invalid', 'false');
                    if (!formMessage.classList.contains('hidden')) {
                        formMessage.classList.add('hidden');
                    }
                }
            });

            input.addEventListener('change', () => {
                if (input.value) {
                    input.classList.remove('border-red-400', 'focus:ring-red-400');
                    input.setAttribute('aria-invalid', 'false');
                    if (!formMessage.classList.contains('hidden')) {
                        formMessage.classList.add('hidden');
                    }
                }
            });
        });

        distributorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('from_name').value.trim();
            const phone = document.getElementById('phone_number').value.trim();
            const city = document.getElementById('city').value.trim();
            const state = document.getElementById('state').value;
            const district = document.getElementById('district').value;
            const business = document.getElementById('business_type').value;

            if (!validateDistributorForm()) {
                return;
            }

            submitBtn.disabled = true;
            submitText.textContent = 'Sending...';
            submitIcon.className = 'fa-solid fa-circle-notch fa-spin';
            formMessage.classList.add('hidden');

            try {
                const response = await fetch(`${API_BASE}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from_name: name,
                        phone_number: phone,
                        city: city,
                        state: state,
                        district: district,
                        business_type: business,
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Unable to send inquiry.');
                }

                showModal();
                distributorForm.reset();
            } catch (error) {
                formMessage.textContent = error.message || 'Oops! Something went wrong. Please try calling us.';
                formMessage.className = 'p-3 rounded-md text-sm font-medium text-center bg-red-100 text-red-800 mt-4';
                formMessage.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitText.textContent = 'Submit Inquiry';
                submitIcon.className = 'fa-solid fa-arrow-right';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const VERIFICATION_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyi74qvsmI_XhnxPUEBBNFuOyHJiUi8ptxB8e1WIM5DJcy6BeHNkWBLinGw6AqwdSW-oA/exec';
    const ADMIN_EMAIL = 'mbstu.phy.alm@gmail.com';

    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const emailForm = document.getElementById('email-form');
    const codeForm = document.getElementById('code-form');
    const emailStep = document.getElementById('email-step');
    const codeStep = document.getElementById('code-step');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const loginMessage = document.getElementById('login-message');
    const logoutBtn = document.getElementById('logout-btn');

    let data; // To be populated after login
    const tabs = document.querySelectorAll('#dashboard-container .tab-btn');
    const formModalContainer = document.getElementById('form-modal');
    const deleteModalContainer = document.getElementById('delete-modal');

    // --- VERIFICATION LOGIC ---
    if (emailForm) {
        emailForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            if (email.toLowerCase() !== ADMIN_EMAIL) {
                loginMessage.textContent = 'Invalid admin email address.'; return;
            }
            sendCodeBtn.disabled = true; sendCodeBtn.textContent = 'Sending...'; loginMessage.textContent = '';
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = Date.now() + 10 * 60 * 1000;
            sessionStorage.setItem('verificationCode', verificationCode);
            sessionStorage.setItem('codeExpiry', expiry);

            fetch(VERIFICATION_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', 
                body: JSON.stringify({ email, code: verificationCode }),
            })
            .then(() => {
                emailStep.classList.add('hidden');
                codeStep.classList.remove('hidden');
            })
            .catch(error => {
                loginMessage.textContent = 'Error: Could not send verification code.';
                console.error('Error:', error);
            })
            .finally(() => {
                sendCodeBtn.disabled = false; sendCodeBtn.textContent = 'Send Code';
            });
        });
    }

    if (codeForm) {
        codeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const code = document.getElementById('verification-code').value;
            const storedCode = sessionStorage.getItem('verificationCode');
            const expiry = sessionStorage.getItem('codeExpiry');
            if (Date.now() > parseInt(expiry)) {
                loginMessage.textContent = 'Code expired. Please request a new one.';
                codeStep.classList.add('hidden'); emailStep.classList.remove('hidden'); return;
            }
            if (code === storedCode) {
                sessionStorage.setItem('isAdminAuthenticated', 'true'); showDashboard();
            } else { loginMessage.textContent = 'Invalid verification code.'; }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            sessionStorage.removeItem('isAdminAuthenticated');
            loginContainer.classList.remove('hidden');
            dashboardContainer.classList.add('hidden');
        });
    }

    function showDashboard() {
        loginContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        if (!document.body.classList.contains('admin-initialized')) {
            initializeAdminPanel();
            document.body.classList.add('admin-initialized');
        }
    }

    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        showDashboard();
    }

    // --- ADMIN PANEL LOGIC (RUNS ONCE AFTER SUCCESSFUL LOGIN) ---
    function initializeAdminPanel() {
        
        function loadData() {
            const storedData = localStorage.getItem('alumniData');
            data = storedData ? JSON.parse(storedData) : { news: [], activities: [], events: [], members: [], pendingMembers: [], committee: [] };
            ['news', 'activities', 'events', 'members', 'pendingMembers', 'committee'].forEach(key => { if (!data[key]) data[key] = []; });
        }
        
        function saveData() {
            localStorage.setItem('alumniData', JSON.stringify(data));
            window.dispatchEvent(new Event('storage'));
        }

        function getListItemHTML(type, item) {
            let title = item.fullName || item.title; let details = ''; let buttons = '';
            switch (type) {
                case 'approveMembers': details = `<p class="text-sm text-gray-600">Email: ${item.email || 'N/A'}</p>`; buttons = `<button class="approve-btn p-2 rounded-md bg-green-500 hover:bg-green-600 text-white" data-id="${item.id}">Approve</button><button class="deny-btn p-2 rounded-md bg-red-500 hover:bg-red-600 text-white" data-id="${item.id}">Deny</button>`; break;
                case 'manageMembers': details = `<p class="text-sm text-gray-600">${item.email || 'N/A'}</p>`; buttons = `<button class="edit-btn p-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-white" data-id="${item.id}" data-type="members">Edit</button><button class="delete-btn p-2 rounded-md bg-red-500 hover:bg-red-600 text-white" data-id="${item.id}" data-type="members">Delete</button>`; break;
                case 'manageCommittee': details = `<p class="text-sm text-gray-600">${item.title}</p>`; buttons = `<button class="remove-committee-btn p-2 rounded-md bg-red-500 hover:bg-red-600 text-white" data-id="${item.id}">Remove</button>`; break;
                default: details = `<p class="text-sm text-gray-600">${item.content || item.description || ''}</p>`; buttons = `<button class="edit-btn p-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-white" data-id="${item.id}" data-type="${type}">Edit</button><button class="delete-btn p-2 rounded-md bg-red-500 hover:bg-red-600 text-white" data-id="${item.id}" data-type="${type}">Delete</button>`; break;
            }
            return `<div class="bg-white shadow-lg rounded-lg p-5 mb-4 flex justify-between items-center"><div><h4 class="font-bold text-lg">${title}</h4>${details}</div><div class="flex space-x-2">${buttons}</div></div>`;
        }

        function renderContent(type) {
            const container = document.getElementById(`content-${type}`); if (!container) return;
            let items, createButtonHTML = '', typeLabel = type.replace(/([A-Z])/g, ' $1').trim(); typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
            switch(type){
                case 'approveMembers': items = data.pendingMembers; break;
                case 'manageMembers': items = data.members; break;
                case 'manageCommittee': items = data.committee; createButtonHTML = `<button class="create-btn mb-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" data-type="manageCommittee">+ Add Committee Member</button>`; break;
                default: items = data[type]; createButtonHTML = `<button class="create-btn mb-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" data-type="${type}">+ Create New ${typeLabel}</button>`;
            }
            let contentHTML = createButtonHTML;
            if(items && items.length > 0) contentHTML += items.map(item => getListItemHTML(type, item)).join('');
            else contentHTML += `<div class="bg-gray-100 p-6 rounded-lg text-center text-gray-500">No items found.</div>`;
            container.innerHTML = contentHTML;
        }

        function renderAllTabs() { ['approveMembers', 'manageMembers', 'manageCommittee', 'news', 'activities', 'events'].forEach(renderContent); }

        function getFormFieldsHTML(type, item = {}) {
            const inputClass = "mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500";
            if (type === 'members') {
                item.institutionalInfo = item.institutionalInfo || {}; item.professionalInfo = item.professionalInfo || {}; item.mailingAddress = item.mailingAddress || {}; item.membershipInfo = item.membershipInfo || { status: 'Pending' };
                let countryCode = '+880'; let phoneNum = item.phone || '';
                if (phoneNum.startsWith('+')) { const match = phoneNum.match(/^\+\d{1,4}/); if (match) { countryCode = match[0]; phoneNum = phoneNum.substring(countryCode.length); } }
                const isPaid = item.membershipInfo.status === 'Paid';
                return `<div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <h3 class="text-lg font-semibold border-b pb-2">Personal & Membership</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="block text-sm font-medium">Full Name</label><input type="text" id="fullName" value="${item.fullName || ''}" class="${inputClass}" required></div>
                        <div><label class="block text-sm font-medium">Date of Birth</label><input type="date" id="dob" value="${item.dob || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Father's Name</label><input type="text" id="fatherName" value="${item.fatherName || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Mother's Name</label><input type="text" id="motherName" value="${item.motherName || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Gender</label><input type="text" id="gender" value="${item.gender || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Blood Group</label><input type="text" id="bloodGroup" value="${item.bloodGroup || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Email</label><input type="email" id="email" value="${item.email || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Phone</label><div class="flex"><input type="text" id="countryCode" value="${countryCode}" class="w-20 ${inputClass} rounded-r-none"><input type="tel" id="phone" value="${phoneNum}" class="${inputClass} rounded-l-none" required></div></div>
                         <div><label class="block text-sm font-medium">Fee Status</label><select id="membershipStatus" class="${inputClass}"><option value="Pending" ${!isPaid ? 'selected' : ''}>Pending</option><option value="Paid" ${isPaid ? 'selected' : ''}>Paid</option></select></div>
                    </div>
                    <div id="payment-details" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ${!isPaid ? 'hidden' : ''}">
                        <div><label class="block text-sm font-medium">Transaction Info</label><input type="text" id="transactionId" value="${item.membershipInfo.transactionId || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Payment Date</label><input type="date" id="paymentDate" value="${item.membershipInfo.paymentDate || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Payment Method</label><input type="text" id="paymentMethod" value="${item.membershipInfo.paymentMethod || ''}" class="${inputClass}"></div>
                        <div><label class="block text-sm font-medium">Membership Validity</label><input type="date" id="validity" value="${item.membershipInfo.validity || ''}" class="${inputClass}"></div>
                    </div>
                    <h3 class="text-lg font-semibold border-b pb-2 pt-4">Institutional Info</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label class="block text-sm font-medium">Season</label><input type="text" id="season" value="${item.institutionalInfo.season || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Batch</label><input type="number" id="batch" value="${item.institutionalInfo.batch || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Student ID</label><input type="text" id="studentId" value="${item.institutionalInfo.studentId || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Passing Year</label><input type="number" id="passingYear" value="${item.institutionalInfo.passingYear || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Degree</label><input type="text" id="degree" value="${item.institutionalInfo.degree || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Supervisor</label><input type="text" id="supervisor" value="${item.institutionalInfo.supervisor || ''}" class="${inputClass}"></div>
                    </div>
                    <h3 class="text-lg font-semibold border-b pb-2 pt-4">Professional Info</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label class="block text-sm font-medium">Sector</label><input type="text" id="sector" value="${item.professionalInfo.sector || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Role</label><input type="text" id="role" value="${item.professionalInfo.role || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Company</label><input type="text" id="company" value="${item.professionalInfo.company || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Work City</label><input type="text" id="workCity" value="${item.professionalInfo.workCity || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Work Country</label><input type="text" id="workCountry" value="${item.professionalInfo.workCountry || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Last Degree</label><input type="text" id="lastDegree" value="${item.professionalInfo.lastDegree || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">University</label><input type="text" id="university" value="${item.professionalInfo.university || ''}" class="${inputClass}"></div>
                         <div class="md:col-span-2"><label class="block text-sm font-medium">LinkedIn</label><input type="url" id="linkedin" value="${item.professionalInfo.linkedin || ''}" class="${inputClass}"></div>
                    </div>
                    <h3 class="text-lg font-semibold border-b pb-2 pt-4">Mailing Address</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label class="block text-sm font-medium">Division</label><input type="text" id="division" value="${item.mailingAddress.division || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">District</label><input type="text" id="district" value="${item.mailingAddress.district || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Sub-district</label><input type="text" id="subDistrict" value="${item.mailingAddress.subDistrict || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">City</label><input type="text" id="city" value="${item.mailingAddress.city || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Union/Ward</label><input type="text" id="unionWard" value="${item.mailingAddress.unionWard || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">House No.</label><input type="text" id="houseNumber" value="${item.mailingAddress.houseNumber || ''}" class="${inputClass}"></div>
                         <div class="md:col-span-2"><label class="block text-sm font-medium">Street</label><input type="text" id="street" value="${item.mailingAddress.street || ''}" class="${inputClass}"></div>
                         <div><label class="block text-sm font-medium">Postal Code</label><input type="text" id="postalCode" value="${item.mailingAddress.postalCode || ''}" class="${inputClass}"></div>
                    </div>
                </div>`;
            } else if (type === 'manageCommittee') {
                const memberOptions = data.members.filter(m => !data.committee.some(c => c.id === m.id)).map(m => `<option value="${m.id}">${m.fullName}</option>`).join('');
                return `<div><label class="block text-sm font-medium">Select Member</label><select id="memberId" class="${inputClass}" required>${memberOptions}</select></div><div class="mt-4"><label class="block text-sm font-medium">Title</label><input type="text" id="title" placeholder="e.g., President" class="${inputClass}" required></div>`;
            } else {
                 return `<div><label class="block text-sm font-medium">Title</label><input type="text" id="title" value="${item.title || ''}" class="${inputClass}" required></div>
                         <div class="mt-4"><label class="block text-sm font-medium">${type === 'news' ? 'Content' : 'Description'}</label><textarea id="${type === 'news' ? 'content' : 'description'}" rows="3" class="${inputClass}" required>${item.content || item.description || ''}</textarea></div>
                         <div class="mt-4"><label class="block text-sm font-medium">Date</label><input type="date" id="date" value="${item.date || ''}" class="${inputClass}" required></div>
                         ${type !== 'news' ? `<div class="mt-4"><label class="block text-sm font-medium">Location (Optional)</label><input type="text" id="location" value="${item.location || ''}" class="${inputClass}"></div>` : ''}
                         <div class="mt-4"><label class="block text-sm font-medium">Image URL (Optional)</label><input type="url" id="imageUrl" value="${item.imageUrl || ''}" class="${inputClass}"></div>`;
            }
        }

        function openModal(modal) { modal.classList.remove('hidden'); setTimeout(() => modal.classList.add('opacity-100'), 10); }
        function openFormModal(type, id = null) {
             const isEdit = id !== null; let item = {}; let typeLabel = type.replace(/([A-Z])/g, ' $1').trim(); typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
             let title = `Create New ${typeLabel}`; let modalWidth = 'max-w-2xl';
             if(type === 'manageCommittee') title = 'Add Committee Member';
             else if (isEdit) { const sourceArray = type === 'members' ? data.members : data[type]; item = sourceArray.find(i => i.id == id); title = `Edit ${typeLabel}`; if (type === 'members') modalWidth = 'max-w-4xl'; }
             formModalContainer.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full ${modalWidth} transform transition-all"><div class="p-6"><h3 class="text-2xl font-bold text-gray-800 mb-4">${title}</h3><form id="modal-form" data-type="${type}" data-id="${id || ''}">${getFormFieldsHTML(type, item)}<div class="mt-6 flex justify-end space-x-4 border-t pt-4"><button type="button" class="modal-cancel px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button><button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save</button></div></form></div></div>`;
             openModal(formModalContainer);
        }
        function openDeleteModal(type, id) {
            deleteModalContainer.innerHTML = `<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center"><h3 class="text-xl font-bold mb-4">Are you sure?</h3><p class="text-gray-600 mb-6">This action cannot be undone.</p><div class="flex justify-center space-x-4"><button class="modal-cancel px-6 py-2 bg-gray-200 rounded-lg">Cancel</button><button id="delete-confirm" data-type="${type}" data-id="${id}" class="px-6 py-2 bg-red-600 text-white rounded-lg">Delete</button></div></div>`;
            openModal(deleteModalContainer);
        }
        function closeModal() {
            formModalContainer.classList.remove('opacity-100');
            deleteModalContainer.classList.remove('opacity-100');
            setTimeout(() => { formModalContainer.classList.add('hidden'); deleteModalContainer.classList.add('hidden'); }, 300);
        }
        function showToast(message) {
            const toast = document.getElementById('toast'); toast.querySelector('p').textContent = message;
            toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 3000);
        }

        // Event Listeners for Dashboard
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => { t.classList.remove('tab-active'); t.classList.add('text-gray-500', 'border-transparent'); });
                tab.classList.add('tab-active'); tab.classList.remove('text-gray-500', 'border-transparent');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(`content-${tab.id.substring(4)}`).classList.remove('hidden');
            });
        });

        document.body.addEventListener('click', e => {
            if (e.target.classList.contains('modal-cancel')) closeModal();
            if (e.target.closest('#dashboard-container')) {
                if(e.target.classList.contains('create-btn')) openFormModal(e.target.dataset.type);
                if(e.target.classList.contains('edit-btn')) openFormModal(e.target.dataset.type, e.target.dataset.id);
                if(e.target.classList.contains('delete-btn')) openDeleteModal(e.target.dataset.type, e.target.dataset.id);
                if(e.target.classList.contains('approve-btn')){ const id = e.target.dataset.id; const member = data.pendingMembers.find(m => m.id == id); if(member){ data.members.push(member); data.pendingMembers = data.pendingMembers.filter(m => m.id != id); saveData(); renderAllTabs(); showToast('Member Approved'); } }
                if(e.target.classList.contains('deny-btn')){ data.pendingMembers = data.pendingMembers.filter(m => m.id != e.target.dataset.id); saveData(); renderContent('approveMembers'); showToast('Member Denied'); }
                if(e.target.classList.contains('remove-committee-btn')){ data.committee = data.committee.filter(c => c.id != e.target.dataset.id); saveData(); renderContent('manageCommittee'); showToast('Committee Member Removed'); }
            }
             if(e.target.id === 'delete-confirm'){
                const { type, id } = e.target.dataset;
                if(type === 'members'){ data.members = data.members.filter(i => i.id != id); data.committee = data.committee.filter(c => c.id != id); }
                else { data[type] = data[type].filter(i => i.id != id); }
                saveData(); renderAllTabs(); closeModal(); showToast('Item Deleted');
            }
        });

        formModalContainer.addEventListener('submit', e => {
            e.preventDefault(); if (e.target.id !== 'modal-form') return;
            const form = e.target; const { type, id } = form.dataset; const isEdit = id !== '';
            if (type === 'members' && isEdit) {
                const memberIndex = data.members.findIndex(m => m.id == id);
                if (memberIndex > -1) {
                    const member = data.members[memberIndex];
                    if (!member.membershipInfo) member.membershipInfo = {};
                    if (!member.institutionalInfo) member.institutionalInfo = {};
                    if (!member.professionalInfo) member.professionalInfo = {};
                    if (!member.mailingAddress) member.mailingAddress = {};
                    member.fullName = form.querySelector('#fullName').value; member.dob = form.querySelector('#dob').value;
                    member.fatherName = form.querySelector('#fatherName').value; member.motherName = form.querySelector('#motherName').value;
                    member.gender = form.querySelector('#gender').value; member.bloodGroup = form.querySelector('#bloodGroup').value;
                    member.email = form.querySelector('#email').value; member.phone = `${form.querySelector('#countryCode').value}${form.querySelector('#phone').value}`;
                    member.membershipInfo.status = form.querySelector('#membershipStatus').value;
                    if(member.membershipInfo.status === 'Paid') {
                        member.membershipInfo.transactionId = form.querySelector('#transactionId').value; member.membershipInfo.paymentDate = form.querySelector('#paymentDate').value;
                        member.membershipInfo.paymentMethod = form.querySelector('#paymentMethod').value; member.membershipInfo.validity = form.querySelector('#validity').value;
                    } else { delete member.membershipInfo.transactionId; delete member.membershipInfo.paymentDate; delete member.membershipInfo.paymentMethod; delete member.membershipInfo.validity; }
                    Object.assign(member.institutionalInfo, { season: form.querySelector('#season').value, batch: form.querySelector('#batch').value, studentId: form.querySelector('#studentId').value, passingYear: form.querySelector('#passingYear').value, degree: form.querySelector('#degree').value, supervisor: form.querySelector('#supervisor').value });
                    Object.assign(member.professionalInfo, { sector: form.querySelector('#sector').value, role: form.querySelector('#role').value, company: form.querySelector('#company').value, workCity: form.querySelector('#workCity').value, workCountry: form.querySelector('#workCountry').value, lastDegree: form.querySelector('#lastDegree').value, university: form.querySelector('#university').value, linkedin: form.querySelector('#linkedin').value });
                    Object.assign(member.mailingAddress, { division: form.querySelector('#division').value, district: form.querySelector('#district').value, subDistrict: form.querySelector('#subDistrict').value, city: form.querySelector('#city').value, unionWard: form.querySelector('#unionWard').value, houseNumber: form.querySelector('#houseNumber').value, street: form.querySelector('#street').value, postalCode: form.querySelector('#postalCode').value });
                }
            } else if (type === 'manageCommittee') {
                const memberId = form.querySelector('#memberId').value; const member = data.members.find(m => m.id == memberId);
                if(member) { const newCommitteeMember = JSON.parse(JSON.stringify(member)); newCommitteeMember.title = form.querySelector('#title').value; data.committee.push(newCommitteeMember); }
            } else {
                let updatedItem = isEdit ? data[type].find(i => i.id == id) : { id: Date.now() };
                updatedItem.title = form.querySelector('#title').value; updatedItem.imageUrl = form.querySelector('#imageUrl').value;
                if(type === 'news') updatedItem.content = form.querySelector('#content').value;
                else { updatedItem.description = form.querySelector('#description').value; updatedItem.date = form.querySelector('#date').value; updatedItem.location = form.querySelector('#location').value; }
                if(!isEdit) data[type].push(updatedItem);
            }
            saveData(); renderAllTabs(); closeModal(); showToast(`Item ${isEdit ? 'updated' : 'created'}`);
        });
        
        loadData();
        renderAllTabs();
    }
});
</script>
</body>
</html>


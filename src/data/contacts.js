import db, { isDatabaseAvailable } from './db.js';
import Fuse from 'fuse.js';
import { parse as csvParse } from 'csv-parse/sync';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

function checkDatabase() {
  if (!isDatabaseAvailable()) {
    throw new Error('Contact database is not available');
  }
}

function canonicalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePhoneNumber(phone, defaultCountry = 'US') {
  if (!phone) return phone;
  try {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (isValidPhoneNumber(cleaned, defaultCountry)) {
      const parsed = parsePhoneNumber(cleaned, defaultCountry);
      return parsed.format('E.164');
    }
    return cleaned;
  } catch {
    return phone.replace(/[^\d+]/g, '');
  }
}

function parseVCard(vcardText) {
  const contacts = [];
  const vcardBlocks = vcardText.split(/(?=BEGIN:VCARD)/i).filter(block => block.trim());
  
  for (const block of vcardBlocks) {
    if (!block.includes('BEGIN:VCARD')) continue;
    
    const contact = {
      displayName: '',
      phoneNumbers: [],
      emails: [],
      organization: '',
      rawVcard: block.trim()
    };
    
    const lines = block.split(/\r?\n/);
    
    for (const line of lines) {
      const fnMatch = line.match(/^FN[;:](.+)/i);
      if (fnMatch) {
        contact.displayName = fnMatch[1].replace(/^[;:]+/, '').trim();
      }
      
      const nMatch = line.match(/^N[;:](.+)/i);
      if (nMatch && !contact.displayName) {
        const parts = nMatch[1].split(';');
        const lastName = parts[0] || '';
        const firstName = parts[1] || '';
        contact.displayName = `${firstName} ${lastName}`.trim();
      }
      
      const telMatch = line.match(/^TEL[^:]*:(.+)/i);
      if (telMatch) {
        const phone = normalizePhoneNumber(telMatch[1].trim());
        if (phone) contact.phoneNumbers.push(phone);
      }
      
      const emailMatch = line.match(/^EMAIL[^:]*:(.+)/i);
      if (emailMatch) {
        contact.emails.push(emailMatch[1].trim());
      }
      
      const orgMatch = line.match(/^ORG[;:](.+)/i);
      if (orgMatch) {
        contact.organization = orgMatch[1].replace(/^[;:]+/, '').replace(/;/g, ', ').trim();
      }
    }
    
    if (contact.displayName || contact.phoneNumbers.length > 0) {
      if (!contact.displayName && contact.phoneNumbers.length > 0) {
        contact.displayName = contact.phoneNumbers[0];
      }
      contacts.push(contact);
    }
  }
  
  return contacts;
}

function parseCSV(csvText) {
  const contacts = [];
  
  try {
    const records = csvParse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    
    for (const record of records) {
      const contact = {
        displayName: '',
        phoneNumbers: [],
        emails: [],
        organization: '',
        rawVcard: ''
      };
      
      const nameFields = ['name', 'Name', 'NAME', 'full_name', 'Full Name', 'display_name', 'Display Name', 'contact', 'Contact'];
      for (const field of nameFields) {
        if (record[field]) {
          contact.displayName = record[field];
          break;
        }
      }
      
      if (!contact.displayName) {
        const firstName = record['first_name'] || record['First Name'] || record['FirstName'] || record['first'] || '';
        const lastName = record['last_name'] || record['Last Name'] || record['LastName'] || record['last'] || '';
        contact.displayName = `${firstName} ${lastName}`.trim();
      }
      
      const phoneFields = ['phone', 'Phone', 'PHONE', 'phone_number', 'Phone Number', 'mobile', 'Mobile', 'tel', 'telephone'];
      for (const field of phoneFields) {
        if (record[field]) {
          const phone = normalizePhoneNumber(record[field]);
          if (phone) contact.phoneNumbers.push(phone);
        }
      }
      
      for (let i = 1; i <= 3; i++) {
        const phoneField = record[`phone${i}`] || record[`Phone${i}`] || record[`Phone ${i}`];
        if (phoneField) {
          const phone = normalizePhoneNumber(phoneField);
          if (phone && !contact.phoneNumbers.includes(phone)) {
            contact.phoneNumbers.push(phone);
          }
        }
      }
      
      const emailFields = ['email', 'Email', 'EMAIL', 'email_address', 'Email Address', 'e-mail'];
      for (const field of emailFields) {
        if (record[field]) {
          contact.emails.push(record[field]);
        }
      }
      
      const orgFields = ['organization', 'Organization', 'company', 'Company', 'org'];
      for (const field of orgFields) {
        if (record[field]) {
          contact.organization = record[field];
          break;
        }
      }
      
      if (contact.displayName || contact.phoneNumbers.length > 0) {
        if (!contact.displayName && contact.phoneNumbers.length > 0) {
          contact.displayName = contact.phoneNumbers[0];
        }
        
        contact.rawVcard = generateVCard(contact);
        contacts.push(contact);
      }
    }
  } catch (error) {
    console.error('CSV parsing error:', error.message);
  }
  
  return contacts;
}

function generateVCard(contact) {
  let vcard = 'BEGIN:VCARD\n';
  vcard += 'VERSION:3.0\n';
  vcard += `FN:${contact.displayName}\n`;
  vcard += `N:${contact.displayName};;;;\n`;
  
  for (const phone of contact.phoneNumbers) {
    vcard += `TEL;TYPE=CELL:${phone}\n`;
  }
  
  for (const email of contact.emails) {
    vcard += `EMAIL:${email}\n`;
  }
  
  if (contact.organization) {
    vcard += `ORG:${contact.organization}\n`;
  }
  
  vcard += 'END:VCARD';
  return vcard;
}

export function upsertContactsFromVcard(buffer) {
  checkDatabase();
  const vcardText = buffer.toString('utf-8');
  const contacts = parseVCard(vcardText);
  return saveContacts(contacts);
}

export function upsertContactsFromCsv(buffer) {
  checkDatabase();
  const csvText = buffer.toString('utf-8');
  const contacts = parseCSV(csvText);
  return saveContacts(contacts);
}

function saveContacts(contacts) {
  checkDatabase();
  
  const insert = db.prepare(`
    INSERT INTO contacts (display_name, canonical_name, phone_numbers, emails, organization, raw_vcard, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const checkExisting = db.prepare(`
    SELECT id FROM contacts WHERE canonical_name = ? AND phone_numbers = ?
  `);
  
  const update = db.prepare(`
    UPDATE contacts SET display_name = ?, phone_numbers = ?, emails = ?, organization = ?, raw_vcard = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  let added = 0;
  let updated = 0;
  
  const transaction = db.transaction(() => {
    for (const contact of contacts) {
      const canonicalName = canonicalizeName(contact.displayName);
      const phonesJson = JSON.stringify(contact.phoneNumbers);
      const emailsJson = JSON.stringify(contact.emails);
      
      const existing = checkExisting.get(canonicalName, phonesJson);
      
      if (existing) {
        update.run(
          contact.displayName,
          phonesJson,
          emailsJson,
          contact.organization,
          contact.rawVcard,
          existing.id
        );
        updated++;
      } else {
        insert.run(
          contact.displayName,
          canonicalName,
          phonesJson,
          emailsJson,
          contact.organization,
          contact.rawVcard
        );
        added++;
      }
    }
  });
  
  transaction();
  
  return { added, updated, total: contacts.length };
}

export function searchContactsByName(searchTerm) {
  checkDatabase();
  const allContacts = db.prepare('SELECT * FROM contacts').all();
  
  if (allContacts.length === 0) {
    return [];
  }
  
  const canonicalSearch = canonicalizeName(searchTerm);
  const exactMatches = allContacts.filter(c => 
    c.canonical_name.includes(canonicalSearch)
  );
  
  if (exactMatches.length > 0) {
    return exactMatches.map(formatContact).slice(0, 5);
  }
  
  const fuse = new Fuse(allContacts, {
    keys: ['display_name', 'canonical_name'],
    threshold: 0.4,
    includeScore: true
  });
  
  const results = fuse.search(searchTerm);
  return results.slice(0, 5).map(r => formatContact(r.item));
}

export function getAllContacts() {
  checkDatabase();
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY display_name').all();
  return contacts.map(formatContact);
}

export function getContactCount() {
  checkDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
  return result.count;
}

function formatContact(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    phoneNumbers: JSON.parse(row.phone_numbers || '[]'),
    emails: JSON.parse(row.emails || '[]'),
    organization: row.organization,
    rawVcard: row.raw_vcard || generateVCard({
      displayName: row.display_name,
      phoneNumbers: JSON.parse(row.phone_numbers || '[]'),
      emails: JSON.parse(row.emails || '[]'),
      organization: row.organization
    })
  };
}

export function deleteContact(id) {
  checkDatabase();
  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  return result.changes > 0;
}

export { generateVCard, isDatabaseAvailable };

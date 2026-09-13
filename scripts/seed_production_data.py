#!/usr/bin/env python3
"""
ADVYON Database Seeding Script
Production-grade realistic Bangladeshi legal data for stakeholder showcase

This script populates the database with authentic Bangladeshi legal content:
- Bangladesh Penal Code 1860 sections
- Evidence Act 1872
- Code of Criminal Procedure 1898
- Code of Civil Procedure 1908
- Specific Relief Act 1877
- Contract Act 1872
- Transfer of Property Act 1882
- Digital Security Act 2018
- Nari-O-Shishu Nirjatan Daman Ain 2000
- And more...

Author: Advyon Development Team
Date: 2026-02-20
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional, Any
from bson import ObjectId

try:
    from pymongo import MongoClient
    import bcrypt
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install pymongo bcrypt")
    exit(1)

# Bcrypt salt rounds (must match backend: BCRYPT_SALT_ROUNDS=12)
BCRYPT_SALT_ROUNDS = 12


def hash_password(password: str) -> str:
    """Hash password using bcrypt (matches Node.js backend)"""
    salt = bcrypt.gensalt(rounds=BCRYPT_SALT_ROUNDS)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


# ==============================================================================
# CONFIGURATION
# ==============================================================================

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://advyon:advyon_password@advyon-v1.mezpjyo.mongodb.net/"
)
DATABASE_NAME = "advyon"

random.seed(42)


# ==============================================================================
# BANGLADESHI LEGAL DATA DEFINITIONS
# ==============================================================================

# ==================== BANGLADESHI LAWS ====================

BANGLADESHI_LAWS = [
    # Penal Code 1860
    {"actName": "The Penal Code", "year": "1860", "number": "302", "title": "Punishment for murder", 
     "chapter": "XVI", "chapterTitle": "Of Offences Affecting the Human Body",
     "previewText": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
     "fullText": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "378", "title": "Theft", 
     "chapter": "XVII", "chapterTitle": "Of Offences Against Property",
     "previewText": "Whoever, intending to take dishonestly any moveable property out of the possession of any person without that person's consent...",
     "fullText": "Whoever, intending to take dishonestly any moveable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "420", "title": "Cheating and dishonestly inducing delivery of property", 
     "chapter": "XVII", "chapterTitle": "Of Offences Against Property",
     "previewText": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property...",
     "fullText": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, shall be punished with imprisonment."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "499", "title": "Defamation", 
     "chapter": "XXI", "chapterTitle": "Of Defamation",
     "previewText": "Whoever by words either spoken or intended to be read, makes or publishes any imputation concerning any person intending to harm...",
     "fullText": "Whoever by words either spoken or intended to be read, or by signs or by visible representations, makes or publishes any imputation concerning any person intending to harm, or knowing or having reason to believe that such imputation will harm, the reputation of such person."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "323", "title": "Punishment for voluntarily causing hurt", 
     "chapter": "XVI", "chapterTitle": "Of Offences Affecting the Human Body",
     "previewText": "Whoever, except in the case provided for by section 334, voluntarily causes hurt...",
     "fullText": "Whoever, except in the case provided for by section 334, voluntarily causes hurt, shall be punished with imprisonment of either description for a term which may extend to one year, or with fine."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "34", "title": "Acts done by several persons in furtherance of common intention", 
     "chapter": "II", "chapterTitle": "General Explanations",
     "previewText": "When a criminal act is done by several persons, in furtherance of the common intention of all...",
     "fullText": "When a criminal act is done by several persons, in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "141", "title": "Unlawful assembly", 
     "chapter": "VIII", "chapterTitle": "Of Offences against the Public Tranquillity",
     "previewText": "An assembly of five or more persons is designated an unlawful assembly, if the common object...",
     "fullText": "An assembly of five or more persons is designated an unlawful assembly, if the common object of the persons comprising that assembly is to overawe by criminal force, or show of criminal force, the Government."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "124A", "title": "Sedition", 
     "chapter": "VI", "chapterTitle": "Of Offences against the State",
     "previewText": "Whoever by words, either spoken or written, brings or attempts to bring into hatred or contempt...",
     "fullText": "Whoever by words, either spoken or written, or by signs, or by visible representation, or otherwise, brings or attempts to bring into hatred or contempt, or excites or attempts to excite disaffection towards the Government established by law."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "307", "title": "Attempt to murder", 
     "chapter": "XVI", "chapterTitle": "Of Offences Affecting the Human Body",
     "previewText": "Whoever does any act with such intention or knowledge that if he by that act caused death he would be guilty of murder...",
     "fullText": "Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, he would be guilty of murder, shall be punished with imprisonment."},
    
    {"actName": "The Penal Code", "year": "1860", "number": "326", "title": "Voluntarily causing grievous hurt by dangerous weapons", 
     "chapter": "XVI", "chapterTitle": "Of Offences Affecting the Human Body",
     "previewText": "Whoever, except in the case provided for by section 335, voluntarily causes grievous hurt by means of any instrument for shooting, stabbing or cutting...",
     "fullText": "Whoever, except in the case provided for by section 335, voluntarily causes grievous hurt by means of any instrument for shooting, stabbing or cutting, shall be punished with imprisonment for life."},

    # Evidence Act 1872
    {"actName": "The Evidence Act", "year": "1872", "number": "3", "title": "Interpretation-clause", 
     "chapter": "I", "chapterTitle": "Preliminary",
     "previewText": "In this Act the following words and expressions are used in the following senses...",
     "fullText": "Fact means and includes any thing, state of things, or relation of things, capable of being perceived by the senses; any mental condition of which any person is conscious."},
    
    {"actName": "The Evidence Act", "year": "1872", "number": "24", "title": "Confession caused by inducement", 
     "chapter": "II", "chapterTitle": "Of the Relevancy of Facts",
     "previewText": "A confession made by an accused person is irrelevant in a criminal proceeding, if the making of the confession appears to the Court to have been caused by any inducement...",
     "fullText": "A confession made by an accused person is irrelevant in a criminal proceeding, if the making of the confession appears to the Court to have been caused by any inducement, threat or promise."},
    
    {"actName": "The Evidence Act", "year": "1872", "number": "32", "title": "Cases in which statement of relevant fact by person who is dead is relevant", 
     "chapter": "II", "chapterTitle": "Of the Relevancy of Facts",
     "previewText": "Statements, written or oral, of relevant facts made by a person who is dead, or who cannot be found...",
     "fullText": "Statements, written or oral, of relevant facts made by a person who is dead, or who cannot be found, or who has become incapable of giving evidence, are themselves relevant facts."},
    
    {"actName": "The Evidence Act", "year": "1872", "number": "45", "title": "Opinions of experts", 
     "chapter": "II", "chapterTitle": "Of the Relevancy of Facts",
     "previewText": "When the Court has to form an opinion upon a point of foreign law, or of science, or art, or as to identity of handwriting...",
     "fullText": "When the Court has to form an opinion upon a point of foreign law, or of science, or art, or as to identity of handwriting or finger impressions, the opinions upon that point of persons specially skilled are relevant facts."},

    # Code of Criminal Procedure 1898
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "54", "title": "When police may arrest without warrant", 
     "chapter": "V", "chapterTitle": "Of Arrest, Escape and Retaking",
     "previewText": "Any police officer may, without an order from a Magistrate and without a warrant, arrest any person who has been concerned in any cognizable offence...",
     "fullText": "Any police officer may, without an order from a Magistrate and without a warrant, arrest any person who has been concerned in any cognizable offence or against whom a reasonable complaint has been made."},
    
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "144", "title": "Power to issue order absolute at once in urgent cases of nuisance", 
     "chapter": "XI", "chapterTitle": "Temporary Orders in Urgent Cases",
     "previewText": "In cases where, in the opinion of a District Magistrate, there is sufficient ground for proceeding under this section...",
     "fullText": "In cases where, in the opinion of a District Magistrate, or any other Magistrate specially empowered by the Government, there is sufficient ground for proceeding under this section and speedy remedy is desirable."},
    
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "161", "title": "Examination of witnesses by police", 
     "chapter": "XIV", "chapterTitle": "Information to the Police and Their Powers to Investigate",
     "previewText": "Any police-officer making an investigation under this Chapter may examine orally any person supposed to be acquainted with the facts and circumstances of the case.",
     "fullText": "Any police-officer making an investigation under this Chapter may examine orally any person supposed to be acquainted with the facts and circumstances of the case. Such person shall be bound to answer all questions."},
    
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "164", "title": "Power to record statements and confessions", 
     "chapter": "XIV", "chapterTitle": "Information to the Police and Their Powers to Investigate",
     "previewText": "Any Metropolitan Magistrate, any judicial Magistrate of the first class may record any statement or confession made to him in the course of an investigation...",
     "fullText": "Any Metropolitan Magistrate, any judicial Magistrate of the first class, or any judicial Magistrate of the second class specially empowered may record any statement or confession made to him in the course of an investigation."},
    
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "497", "title": "When bail may be taken in case of non-bailable offence", 
     "chapter": "XXXIX", "chapterTitle": "Of Bail",
     "previewText": "When any person accused of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police-station...",
     "fullText": "When any person accused of any non-bailable offence is arrested or detained without warrant, he may be released on bail, but he shall not be so released if there appear reasonable grounds."},
    
    {"actName": "The Code of Criminal Procedure", "year": "1898", "number": "107", "title": "Security for keeping the peace in other cases", 
     "chapter": "VIII", "chapterTitle": "Of Security for Keeping the Peace and for Good Behaviour",
     "previewText": "Whenever a District Magistrate or any other Executive Magistrate is informed that any person is likely to commit a breach of the peace...",
     "fullText": "Whenever a District Magistrate or any other Executive Magistrate is informed that any person is likely to commit a breach of the peace or disturb the public tranquillity, the Magistrate may require such person to show cause."},

    # Code of Civil Procedure 1908
    {"actName": "The Code of Civil Procedure", "year": "1908", "number": "9", "title": "Courts to try all civil suits unless barred", 
     "chapter": "I", "chapterTitle": "Suits in General",
     "previewText": "The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature...",
     "fullText": "The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature excepting suits of which their cognizance is either expressly or impliedly barred."},
    
    {"actName": "The Code of Civil Procedure", "year": "1908", "number": "11", "title": "Res judicata", 
     "chapter": "I", "chapterTitle": "Suits in General",
     "previewText": "No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit...",
     "fullText": "No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit between the same parties."},
    
    {"actName": "The Code of Civil Procedure", "year": "1908", "number": "96", "title": "Appeal from original decree", 
     "chapter": "VII", "chapterTitle": "Appeals from Original Decrees",
     "previewText": "Save where otherwise expressly provided in the body of this Code, an appeal shall lie from every decree passed by any Court...",
     "fullText": "Save where otherwise expressly provided in the body of this Code or by any other law for the time being in force, an appeal shall lie from every decree passed by any Court exercising original jurisdiction."},
    
    {"actName": "The Code of Civil Procedure", "year": "1908", "number": "Order 39 Rule 1", "title": "Cases in which temporary injunction may be granted", 
     "chapter": "Order XXXIX", "chapterTitle": "Temporary Injunctions and Interlocutory Orders",
     "previewText": "Where in any suit it is proved by affidavit that any property in dispute in a suit is in danger of being wasted, damaged or alienated...",
     "fullText": "Where in any suit it is proved by affidavit or otherwise that any property in dispute in a suit is in danger of being wasted, damaged or alienated by any party to the suit, or wrongfully sold in execution of a decree."},

    # Contract Act 1872
    {"actName": "The Contract Act", "year": "1872", "number": "2", "title": "Interpretation-clause", 
     "chapter": "I", "chapterTitle": "Preliminary",
     "previewText": "In this Act the following words and expressions are used in the following senses...",
     "fullText": "When one person signifies to another his willingness to do or to abstain from doing anything, with a view to obtaining the assent of that other to such act or abstinence, he is said to make a proposal."},
    
    {"actName": "The Contract Act", "year": "1872", "number": "10", "title": "What agreements are contracts", 
     "chapter": "II", "chapterTitle": "Of Contracts, Voidable Contracts and Void Agreements",
     "previewText": "All agreements are contracts if they are made by the free consent of parties competent to contract...",
     "fullText": "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void."},
    
    {"actName": "The Contract Act", "year": "1872", "number": "23", "title": "What considerations and objects are lawful", 
     "chapter": "II", "chapterTitle": "Of Contracts, Voidable Contracts and Void Agreements",
     "previewText": "The consideration or object of an agreement is lawful, unless it is forbidden by law...",
     "fullText": "The consideration or object of an agreement is lawful, unless it is forbidden by law; or is of such a nature that, if permitted, it would defeat the provisions of any law; or is fraudulent."},
    
    {"actName": "The Contract Act", "year": "1872", "number": "73", "title": "Compensation for loss or damage caused by breach of contract", 
     "chapter": "VI", "chapterTitle": "Of the Consequences of Breach of Contract",
     "previewText": "When a contract has been broken, the party who suffers by such breach is entitled to receive compensation...",
     "fullText": "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby."},

    # Transfer of Property Act 1882
    {"actName": "The Transfer of Property Act", "year": "1882", "number": "54", "title": "Sale defined", 
     "chapter": "III", "chapterTitle": "Of Sales of Immoveable Property",
     "previewText": "Sale is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised.",
     "fullText": "Sale is a transfer of ownership in exchange for a price paid or promised or part-paid and part-promised. Such transfer, in the case of tangible immoveable property of the value of one hundred taka and upwards, can be made only by a registered instrument."},
    
    {"actName": "The Transfer of Property Act", "year": "1882", "number": "58", "title": "Mortgage defined", 
     "chapter": "IV", "chapterTitle": "Of Mortgages of Immoveable Property",
     "previewText": "A mortgage is the transfer of an interest in specific immoveable property for the purpose of securing payment of money advanced...",
     "fullText": "A mortgage is the transfer of an interest in specific immoveable property for the purpose of securing the payment of money advanced or to be advanced by way of loan, an existing or future debt."},
    
    {"actName": "The Transfer of Property Act", "year": "1882", "number": "105", "title": "Lease defined", 
     "chapter": "V", "chapterTitle": "Of Leases of Immoveable Property",
     "previewText": "A lease of immoveable property is a transfer of a right to enjoy such property, made for a certain time, express or implied...",
     "fullText": "A lease of immoveable property is a transfer of a right to enjoy such property, made for a certain time, express or implied, or in perpetuity, in consideration of a price paid or promised."},

    # Specific Relief Act 1877
    {"actName": "The Specific Relief Act", "year": "1877", "number": "12", "title": "Cases in which specific performance enforceable", 
     "chapter": "II", "chapterTitle": "Of the Specific Performance of Contracts",
     "previewText": "Except as otherwise provided in this Chapter, the specific performance of any contract may in the discretion of the Court be enforced...",
     "fullText": "Except as otherwise provided in this Chapter, the specific performance of any contract may in the discretion of the Court be enforced when the act agreed to be done is in the performance wholly or partly of a trust."},

    # Nari-O-Shishu Nirjatan Daman Ain 2000
    {"actName": "The Nari-O-Shishu Nirjatan Daman Ain", "year": "2000", "number": "9", "title": "Punishment for Rape", 
     "chapter": "II", "chapterTitle": "Offences and Penalties",
     "previewText": "If any man commits rape upon a woman or child, he shall be punished with death, or imprisonment for life...",
     "fullText": "If any man commits rape upon a woman or child, he shall be punished with death, or imprisonment for life, and shall also be liable to fine."},
    
    {"actName": "The Nari-O-Shishu Nirjatan Daman Ain", "year": "2000", "number": "11", "title": "Punishment for causing death for dowry", 
     "chapter": "II", "chapterTitle": "Offences and Penalties",
     "previewText": "If the husband of a woman or the father causes death or attempts to cause death of a woman for dowry...",
     "fullText": "If the husband of a woman or the father, mother, guardian, relative or any other person on the side of the husband causes death or attempts to cause death of a woman for dowry, he shall be punished with death or imprisonment for life."},

    # Digital Security Act 2018
    {"actName": "The Digital Security Act", "year": "2018", "number": "17", "title": "Punishment for unauthorized access to computer", 
     "chapter": "III", "chapterTitle": "Offences and Penalties",
     "previewText": "If any person gains unauthorized access to any computer, computer system or computer network...",
     "fullText": "If any person gains unauthorized access to any computer, computer system or computer network with criminal intention, shall be punished with imprisonment."},
    
    {"actName": "The Digital Security Act", "year": "2018", "number": "21", "title": "Punishment for identity theft", 
     "chapter": "III", "chapterTitle": "Offences and Penalties",
     "previewText": "If any person with fraudulent intention creates or uses false identity...",
     "fullText": "If any person with fraudulent intention creates or uses false identity, or uses the identity of another person in any manner, shall be punished with imprisonment."},

    # Limitation Act 1908
    {"actName": "The Limitation Act", "year": "1908", "number": "3", "title": "Dismissal of suits instituted after period of limitation", 
     "chapter": "II", "chapterTitle": "Limitation of Suits, Appeals and Applications",
     "previewText": "Subject to the provisions contained in sections 4 to 25, every suit instituted after the period of limitation shall be dismissed...",
     "fullText": "Subject to the provisions contained in sections 4 to 25 (inclusive), every suit instituted, appeal preferred, and application made after the period of limitation prescribed therefor shall be dismissed."},
    
    {"actName": "The Limitation Act", "year": "1908", "number": "5", "title": "Extension of period in certain cases", 
     "chapter": "II", "chapterTitle": "Limitation of Suits, Appeals and Applications",
     "previewText": "Any appeal or application for review of judgment may be admitted after the period of limitation...",
     "fullText": "Any appeal or application for a review of judgment or for leave to appeal or any other application may be admitted after the period of limitation when the appellant satisfies the Court that he had sufficient cause."},

    # Registration Act 1908
    {"actName": "The Registration Act", "year": "1908", "number": "17", "title": "Documents of which registration is compulsory", 
     "chapter": "III", "chapterTitle": "Of Registrable Documents",
     "previewText": "The following documents shall be registered, if the property to which they relate is situate in a district...",
     "fullText": "The following documents shall be registered: instruments of gift of immoveable property; other non-testamentary instruments which purport to create, declare, assign, limit or extinguish any right."},

    # Labor Act 2006
    {"actName": "The Labor Act", "year": "2006", "number": "3", "title": "Conditions of employment", 
     "chapter": "II", "chapterTitle": "Conditions of Service and Employment",
     "previewText": "In every establishment, the conditions of employment and other matters shall be as specified in this Chapter...",
     "fullText": "In every establishment, the conditions of employment and other matters relating to service shall be as specified in this Chapter."},
    
    {"actName": "The Labor Act", "year": "2006", "number": "18", "title": "Procedure for punishment", 
     "chapter": "II", "chapterTitle": "Conditions of Service and Employment",
     "previewText": "No order of punishment under section 17 shall be made against a worker unless the allegations are recorded in writing...",
     "fullText": "No order of punishment under section 17 shall be made against a worker unless the allegations against him are recorded in writing, he is given a copy thereof and not less than seven days time to explain."},

    # Consumer Rights Protection Act 2009
    {"actName": "The Consumer Rights Protection Act", "year": "2009", "number": "37", "title": "Punishment for not displaying price of goods", 
     "chapter": "V", "chapterTitle": "Offences and Penalties",
     "previewText": "If any person fails to display the price-list of goods at a visible place of his shop or business establishment...",
     "fullText": "If any person fails to display the price-list of goods at a visible place of his shop or business establishment, he shall be punished with imprisonment for a term not exceeding one year, or with fine."},
]


# ==================== BANGLADESHI COURTS ====================

COURT_LOCATIONS = [
    "Supreme Court of Bangladesh, High Court Division, Dhaka",
    "Supreme Court of Bangladesh, Appellate Division, Dhaka",
    "Dhaka District Judge Court, Dhaka",
    "Dhaka Metropolitan Sessions Judge Court, Dhaka",
    "Dhaka Senior Judicial Magistrate Court, Dhaka",
    "Joint District Judge Court, Dhaka",
    "Additional District Judge Court, Dhaka",
    "Family Court, Dhaka",
    "Artha Rin Adalat, Dhaka",
    "Labour Court, Dhaka",
    "Intellectual Property Office, Dhaka",
    "National Board of Revenue, Dhaka",
    "Chittagong District Judge Court, Chittagong",
    "Sylhet District Judge Court, Sylhet",
    "Khulna District Judge Court, Khulna",
    "Barisal District Judge Court, Barisal",
    "Rajshahi District Judge Court, Rajshhi",
    "Virtual Court Hearing - Video Conference",
    "Law Firm Chamber, Gulshan Avenue, Dhaka",
    "Chamber No. 15, Supreme Court Bar Association Building"
]


# ==================== CASE TYPES & SCENARIOS ====================

# Realistic Bangladeshi case scenarios
CIVIL_LITIGATION_SCENARIOS = [
    {"title": "Shahriar Trading Co. v. Bengal Industries Ltd.", "type": "Civil Litigation", 
     "description": "Contract breach - Supplier failed to deliver goods worth BDT 45,00,000 within stipulated time."},
    {"title": "Property Dispute - Dhanmondi Residential Plot", "type": "Civil Litigation",
     "description": "Title dispute over 5 Katha plot in Dhanmondi R/A, Block-A, Dhaka."},
    {"title": "SuSpecific Performance - Sale Agreement", "type": "Civil Litigation",
     "description": "Seller refusing to execute registered deed for commercial property at Gulshan-2."},
    {"title": "Injunction Application - Business Premises", "type": "Civil Litigation",
     "description": "Seeking permanent injunction against illegal occupation of factory premises."},
    {"title": "Money Recovery Suit - Professional Fees", "type": "Civil Litigation",
     "description": "Architect claiming BDT 12,00,000 for services rendered in commercial building project."},
    {"title": "Declaratory Suit - Partnership Dissolution", "type": "Civil Litigation",
     "description": "Seeking declaration of partnership dissolution and accounts settlement."},
    {"title": "Permanent Injunction - Trade Secret", "type": "Civil Litigation",
     "description": "Protecting confidential business information and client lists from ex-employee."},
]

CORPORATE_LAW_SCENARIOS = [
    {"title": "Company Incorporation - Shahriar Holdings Ltd.", "type": "Corporate Law",
     "description": "Incorporation of private limited company with BDT 10,00,000 paid-up capital."},
    {"title": "Shareholders Agreement - TechVentures Bangladesh", "type": "Corporate Law",
     "description": "Drafting SHA between three promoters for IT startup venture."},
    {"title": "Merger Advisory - ABC Textiles & XYZ Fabrics", "type": "Corporate Law",
     "description": "Merger of two textile companies under Companies Act 1994."},
    {"title": "Corporate Compliance Review - 2026", "type": "Corporate Law",
     "description": "Annual compliance audit for publicly listed company."},
    {"title": "Joint Venture Agreement - Real Estate Development", "type": "Corporate Law",
     "description": "JVA between local developer and foreign investor for mixed-use project."},
]

INTELLECTUAL_PROPERTY_SCENARIOS = [
    {"title": "Trademark Application - 'Shahriar' Brand", "type": "Intellectual Property",
     "description": "Trademark registration for clothing brand under Class 25."},
    {"title": "Copyright - Software Product 'LegalEase'", "type": "Intellectual Property",
     "description": "Copyright registration for legal case management software."},
    {"title": "Patent Application - Agricultural Technology", "type": "Intellectual Property",
     "description": "Patent filing for new irrigation technology with IP Office."},
    {"title": "Trade Dress Infringement - Restaurant Chain", "type": "Intellectual Property",
     "description": "Injunction against competitor copying restaurant's distinctive trade dress."},
    {"title": "License Agreement - Franchise Business", "type": "Intellectual Property",
     "description": "Franchise license agreement for international restaurant brand."},
]

REAL_ESTATE_SCENARIOS = [
    {"title": "Commercial Property Purchase - Gulshan Avenue", "type": "Real Estate",
     "description": "Due diligence and documentation for BDT 5,00,00,000 commercial building."},
    {"title": "Land Title Verification - Savar Industrial Area", "type": "Real Estate",
     "description": "Title search and encumbrance certificate for 3 bigha industrial land."},
    {"title": "Lease Agreement - Office Space Banani", "type": "Real Estate",
     "description": "Commercial lease for 5000 sq ft office space, 5-year term."},
    {"title": "Property Mutation - Family Inheritance", "type": "Real Estate",
     "description": "Mutation of agricultural land inherited under Will."},
    {"title": "Mortgage Documentation - Bank Loan", "type": "Real Estate",
     "description": "Property mortgage documentation for BDT 2,00,00,000 bank loan."},
]

FAMILY_LAW_SCENARIOS = [
    {"title": "Divorce by Mutual Consent", "type": "Family Law",
     "description": "Mutual divorce petition under Muslim Personal Law."},
    {"title": "Child Custody Application", "type": "Family Law",
     "description": "Custody petition for minor child under Guardians and Wards Act."},
    {"title": "Maintenance Claim - Wife and Children", "type": "Family Law",
     "description": "Maintenance application under Code of Criminal Procedure section 488."},
    {"title": "Will & Testament Drafting", "type": "Family Law",
     "description": "Drafting Will for business owner distributing assets worth BDT 10 crore."},
    {"title": "Marriage Registration - Special Marriage Act", "type": "Family Law",
     "description": "Registration under Special Marriage Act for inter-faith couple."},
]

CRIMINAL_DEFENSE_SCENARIOS = [
    {"title": "Bail Application - Section 54 CrPC", "type": "Criminal Defense",
     "description": "Bail petition for client arrested under false theft accusation."},
    {"title": "Defense - False Cheating Case", "type": "Criminal Defense",
     "description": "Defending client accused under Section 420 PPC cheating case."},
    {"title": "Anticipatory Bail Petition", "type": "Criminal Defense",
     "description": "Seeking anticipatory bail before potential arrest in fraud case."},
    {"title": "Criminal Revision - Lower Court Judgment", "type": "Criminal Defense",
     "description": "Revision petition against conviction in summary trial."},
    {"title": "Complaint Withdrawal - Section 257 CrPC", "type": "Criminal Defense",
     "description": "Application for withdrawal of criminal complaint by complainant."},
]

EMPLOYMENT_LAW_SCENARIOS = [
    {"title": "Unfair Termination - Service Benefit Claim", "type": "Employment Law",
     "description": "Claim for wrongful dismissal and unpaid gratuity BDT 18,00,000."},
    {"title": "Workplace Harassment Case", "type": "Employment Law",
     "description": "Legal action against employer for workplace sexual harassment."},
    {"title": "Gratuity Calculation Dispute", "type": "Employment Law",
     "description": "Dispute over gratuity calculation under Labour Act 2006."},
    {"title": "Salary Arrears Recovery", "type": "Employment Law",
     "description": "Recovery of 6 months salary arrears from defaulting employer."},
]

TAX_LAW_SCENARIOS = [
    {"title": "Income Tax Return Filing - 2025-26", "type": "Tax Law",
     "description": "Preparation and filing of annual income tax return."},
    {"title": "VAT Registration - Trading Business", "type": "Tax Law",
     "description": "VAT registration for new import-export business."},
    {"title": "Tax Appeal - Additional Assessment", "type": "Tax Law",
     "description": "Appeal against NBR additional tax assessment of BDT 25,00,000."},
    {"title": "Withholding Tax Certificate", "type": "Tax Law",
     "description": "Application for withholding tax exemption certificate."},
]


# ==================== DOCUMENT TYPES ====================

DOCUMENT_TYPES_BD = {
    "Evidence": [
        "Affidavit in Support.pdf",
        "Police Case Documents.pdf",
        "Medical Certificate.pdf",
        "Investigation Report.pdf",
        " Forensic Analysis Report.pdf"
    ],
    "Witness Statements": [
        "Witness Statement - PW-1.pdf",
        "Witness Statement - PW-2.pdf",
        "Deposition Transcript.pdf",
        "Eye Witness Affidavit.pdf"
    ],
    "Legal Documents": [
        "Plaint.pdf",
        "Written Statement.pdf",
        "Written Statement - Reply.pdf",
        "Interim Application.pdf",
        "Vakalatanama.pdf"
    ],
    "Contracts & Agreements": [
        "Sale Agreement Draft.pdf",
        "Partnership Deed.pdf",
        "Power of Attorney.pdf",
        "Indemnity Bond.pdf",
        "Memorandum of Understanding.pdf"
    ],
    "Correspondence": [
        "Legal Notice.pdf",
        "Demand Letter.pdf",
        "Correspondence with NBR.pdf",
        "Court Registry Letters.pdf"
    ],
    "Court Orders": [
        "Order Sheet.pdf",
        "Judgment Copy.pdf",
        "Stay Order.pdf",
        "Bail Order.pdf",
        "Interim Order.pdf"
    ],
    "Property Documents": [
        "Title Deed.pdf",
        "Mutation Certificate.pdf",
        "Khatian - Land Survey.pdf",
        "DCR - Record of Rights.pdf",
        "Encumbrance Certificate.pdf"
    ],
    "Corporate Documents": [
        "Certificate of Incorporation.pdf",
        "Memorandum of Association.pdf",
        "Articles of Association.pdf",
        "Board Resolution.pdf",
        "Shareholders Resolution.pdf"
    ],
    "Tax Documents": [
        "TIN Certificate.pdf",
        "Tax Clearance Certificate.pdf",
        "VAT Certificate.pdf",
        "Tax Assessment Order.pdf",
        "Withholding Tax Certificate.pdf"
    ]
}


# ==================== EXISTING USERS ====================

EXISTING_USERS = [
    {"email": "imoral223489@bscse.uiu.ac.bd", "id": "LAW-0001", "role": "lawyer", "password": "imoral223489$123"},
    {"email": "ihmorol@gmail.com", "id": "ADM-0001", "role": "admin", "password": "ihmorol123"},
    {"email": "ekramulhasane69@gmail.com", "id": "CLI-0001", "role": "client", "password": "ekramulhasane69$123"}
]


# ==================== NEW USERS ====================

NEW_LAWYER = {
    "email": "abubakarmunshi786@gmail.com",
    "password": "1234567890",
    "full_name": "Adv. Abubakar Munshi",
    "display_name": "Abubakar",
    "phone": "+8801712345678",
    "address": "Chamber No. 12, Supreme Court Bar Association Building, Dhaka",
    "bio": "Senior Advocate specializing in Corporate Law, Civil Litigation, and Intellectual Property with over 8 years of experience in the Bangladesh legal system.",
    "bar_registration": "BAR-2016-3829",
    "bar_council": "Bangladesh Bar Council",
    "experience": 8,
    "practice_area": "Corporate Law",
    "id": "LAW-0002"
}

NEW_CLIENT = {
    "email": "adsh257@gmail.com",
    "password": "1234567890",
    "full_name": "Abdullah Al Shahriar",
    "display_name": "Shahriar",
    "phone": "+8801812345679",
    "address": "House 45, Road 11, Gulshan-2, Dhaka 1212",
    "bio": "Entrepreneur and business owner seeking legal consultation for corporate matters, contract negotiations, and intellectual property protection.",
    "id": "CLI-0002"
}


# ==================== UTILITY FUNCTIONS ====================

def business_id(prefix: str, index: int) -> str:
    return f"{prefix}-{index:04d}"

def random_date(start_days_ago: int, end_days_ahead: int) -> datetime:
    now = datetime.now()
    delta_days = random.randint(start_days_ago, end_days_ahead)
    return now + timedelta(days=delta_days)

def pick_weighted(items: list, weights: list) -> Any:
    return random.choices(items, weights=weights, k=1)[0]


# ==============================================================================
# MAIN SEEDER CLASS
# ==============================================================================

class AdvyonSeeder:
    def __init__(self, mongo_uri: str, db_name: str):
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        
        # Collections
        self.users = self.db["users"]
        self.clientprofiles = self.db["clientprofiles"]
        self.lawyerprofiles = self.db["lawyerprofiles"]
        self.cases = self.db["cases"]
        self.documents = self.db["documents"]
        self.messages = self.db["messages"]
        self.schedules = self.db["schedules"]
        self.notifications = self.db["notifications"]
        self.activities = self.db["activities"]
        self.subscriptions = self.db["subscriptions"]
        self.payments = self.db["payments"]
        self.threads = self.db["threads"]
        self.replies = self.db["replies"]
        self.moderation_reviews = self.db["moderationreviews"]
        self.engagement_events = self.db["communityengagementevents"]
        self.case_accesses = self.db["caseaccesses"]
        self.personalizations = self.db["personalizations"]
        self.ai_conversation_contexts = self.db["aiconversationcontexts"]
        self.ai_personalization_profiles = self.db["aipersonalizationprofiles"]
        self.ai_tool_histories = self.db["aitoolhistories"]
        self.roles = self.db["roles"]
        self.user_roles = self.db["userroles"]
        self.legals = self.db["legals"]
        self.audit_logs = self.db["auditlogs"]
        self.system_settings = self.db["systemsettings"]
        
        # In-memory storage
        self.user_map = {}
        self.case_map = {}
        
    def clear_data(self):
        """Clear all non-user data"""
        print("\n" + "="*60)
        print("STEP 1: Clearing existing data...")
        print("="*60)
        
        collections = [
            "clientprofiles", "lawyerprofiles", "judgeprofiles",
            "cases", "documents", "messages", "schedules",
            "notifications", "activities", "subscriptions", "payments",
            "threads", "replies", "moderationreviews", "moderationappeals",
            "communityengagementevents", "caseaccesses", "personalizations",
            "aiconversationcontexts", "aipersonalizationprofiles",
            "aitoolhistories", "roles", "userroles", "legals",
            "auditlogs", "systemsettings"
        ]
        
        for coll in collections:
            result = self.db[coll].delete_many({})
            print(f"  - Cleared {coll}")
        
        # Note: We do NOT clear users - we keep existing and update/add new
        print(f"  - Kept users collection (for existing accounts)")
        
        print("\n[OK] Data cleared!")
        
    def get_existing_users(self):
        """Load existing users and update passwords"""
        print("\n" + "="*60)
        print("STEP 2: Loading existing users...")
        print("="*60)
        
        for user_data in EXISTING_USERS:
            user = self.users.find_one({"email": user_data["email"]})
            if user:
                # Update password if provided
                if "password" in user_data:
                    hashed_pwd = hash_password(user_data["password"])
                    self.users.update_one(
                        {"email": user_data["email"]},
                        {"$set": {"password": hashed_pwd}}
                    )
                    print(f"  [OK] Found & password updated: {user_data['email']} ({user_data['role']})")
                else:
                    print(f"  [OK] Found: {user_data['email']} ({user_data['role']})")
                self.user_map[user_data["email"]] = user
            else:
                # User doesn't exist - create with specified password
                print(f"  [!] Creating missing user: {user_data['email']}")
                new_user = {
                    "id": user_data["id"],
                    "email": user_data["email"],
                    "password": hash_password(user_data["password"]),
                    "fullName": user_data["email"].split("@")[0].replace(".", " ").title(),
                    "displayName": user_data["email"].split("@")[0],
                    "avatarUrl": f"https://api.dicebear.com/7.x/initials/svg?seed={user_data['email'].split('@')[0]}",
                    "primaryRole": user_data["role"],
                    "isEmailVerified": True,
                    "preferredLanguage": "en",
                    "timezone": "Asia/Dhaka",
                    "needsPasswordChange": False,
                    "role": user_data["role"],
                    "status": "active",
                    "isDeleted": False,
                    "preferences": {
                        "theme": "system",
                        "notifications": {"emailDigest": True, "pushAlerts": True, "hearingReminders": True},
                        "dashboardConfig": {"showActivityFeed": True, "showAIInsights": True, "defaultView": "classic"}
                    },
                    "points": 0,
                    "weeklyPoints": 0,
                    "lastWeekReset": datetime.now()
                }
                result = self.users.insert_one(new_user)
                new_user["_id"] = result.inserted_id
                self.user_map[user_data["email"]] = new_user
                print(f"  [OK] Created user: {user_data['email']}")
    
    def create_new_users(self):
        """Create new lawyer and client or update if exists"""
        print("\n" + "="*60)
        print("STEP 3: Creating new users...")
        print("="*60)
        
        # Check if lawyer already exists
        existing_lawyer = self.users.find_one({"email": NEW_LAWYER["email"]})
        
        if existing_lawyer:
            # Update password
            hashed_pwd = hash_password(NEW_LAWYER["password"])
            self.users.update_one(
                {"email": NEW_LAWYER["email"]},
                {"$set": {"password": hashed_pwd}}
            )
            existing_lawyer["password"] = hashed_pwd
            self.user_map[NEW_LAWYER["email"]] = existing_lawyer
            
            # Check if profile already exists
            existing_lawyer_profile = self.lawyerprofiles.find_one({"userId": str(existing_lawyer["_id"])})
            if not existing_lawyer_profile:
                self.lawyerprofiles.insert_one({
                    "id": NEW_LAWYER["id"],
                    "userId": str(existing_lawyer["_id"]),
                    "barRegistrationNumber": NEW_LAWYER["bar_registration"],
                    "barCouncilName": NEW_LAWYER["bar_council"],
                    "yearsOfExperience": NEW_LAWYER["experience"],
                    "primaryPracticeArea": NEW_LAWYER["practice_area"],
                    "verificationStatus": "verified",
                    "verificationNotes": "Verified senior advocate with excellent track record."
                })
                print(f"  [OK] Created lawyer profile for: {NEW_LAWYER['email']}")
            print(f"  [OK] Updated lawyer: {NEW_LAWYER['email']}")
        else:
            # Create new Lawyer
            lawyer_user = {
                "id": NEW_LAWYER["id"],
                "email": NEW_LAWYER["email"],
                "password": hash_password(NEW_LAWYER["password"]),
                "fullName": NEW_LAWYER["full_name"],
                "displayName": NEW_LAWYER["display_name"],
                "avatarUrl": f"https://api.dicebear.com/7.x/initials/svg?seed=Abubakar",
                "primaryRole": "lawyer",
                "isEmailVerified": True,
                "preferredLanguage": "en",
                "timezone": "Asia/Dhaka",
                "phone": NEW_LAWYER["phone"],
                "address": NEW_LAWYER["address"],
                "bio": NEW_LAWYER["bio"],
                "needsPasswordChange": False,
                "role": "lawyer",
                "status": "active",
                "isDeleted": False,
                "preferences": {
                    "theme": "system",
                    "notifications": {"emailDigest": True, "pushAlerts": True, "hearingReminders": True},
                    "dashboardConfig": {"showActivityFeed": True, "showAIInsights": True, "defaultView": "classic"}
                },
                "points": random.randint(500, 5000),
                "weeklyPoints": random.randint(50, 500),
                "lastWeekReset": datetime.now()
            }
            
            result = self.users.insert_one(lawyer_user)
            lawyer_user["_id"] = result.inserted_id
            self.user_map[NEW_LAWYER["email"]] = lawyer_user
            
            # Create Lawyer Profile
            self.lawyerprofiles.insert_one({
                "id": NEW_LAWYER["id"],
                "userId": str(result.inserted_id),
                "barRegistrationNumber": NEW_LAWYER["bar_registration"],
                "barCouncilName": NEW_LAWYER["bar_council"],
                "yearsOfExperience": NEW_LAWYER["experience"],
                "primaryPracticeArea": NEW_LAWYER["practice_area"],
                "verificationStatus": "verified",
                "verificationNotes": "Verified senior advocate with excellent track record."
            })
            print(f"  [OK] Created lawyer: {NEW_LAWYER['email']}")
        
        # Check if client already exists
        existing_client = self.users.find_one({"email": NEW_CLIENT["email"]})
        
        if existing_client:
            # Update password
            hashed_pwd = hash_password(NEW_CLIENT["password"])
            self.users.update_one(
                {"email": NEW_CLIENT["email"]},
                {"$set": {"password": hashed_pwd}}
            )
            existing_client["password"] = hashed_pwd
            self.user_map[NEW_CLIENT["email"]] = existing_client
            
            # Check if profile already exists
            existing_client_profile = self.clientprofiles.find_one({"userId": str(existing_client["_id"])})
            if not existing_client_profile:
                self.clientprofiles.insert_one({
                    "id": NEW_CLIENT["id"],
                    "userId": str(existing_client["_id"]),
                    "phoneNumber": NEW_CLIENT["phone"],
                    "address": NEW_CLIENT["address"]
                })
                print(f"  [OK] Created client profile for: {NEW_CLIENT['email']}")
            print(f"  [OK] Updated client: {NEW_CLIENT['email']}")
        else:
            # Create new Client
            client_user = {
                "id": NEW_CLIENT["id"],
                "email": NEW_CLIENT["email"],
                "password": hash_password(NEW_CLIENT["password"]),
                "fullName": NEW_CLIENT["full_name"],
                "displayName": NEW_CLIENT["display_name"],
                "avatarUrl": f"https://api.dicebear.com/7.x/initials/svg?seed=Shahriar",
                "primaryRole": "client",
                "isEmailVerified": True,
                "preferredLanguage": "en",
                "timezone": "Asia/Dhaka",
                "phone": NEW_CLIENT["phone"],
                "address": NEW_CLIENT["address"],
                "bio": NEW_CLIENT["bio"],
                "needsPasswordChange": False,
                "role": "client",
                "status": "active",
                "isDeleted": False,
                "preferences": {
                    "theme": "dark",
                    "notifications": {"emailDigest": True, "pushAlerts": False, "hearingReminders": True},
                    "dashboardConfig": {"showActivityFeed": True, "showAIInsights": False, "defaultView": "kanban"}
                },
                "points": random.randint(100, 1000),
                "weeklyPoints": random.randint(10, 100),
                "lastWeekReset": datetime.now()
            }
            
            result = self.users.insert_one(client_user)
            client_user["_id"] = result.inserted_id
            self.user_map[NEW_CLIENT["email"]] = client_user
            
            # Client Profile
            self.clientprofiles.insert_one({
                "id": NEW_CLIENT["id"],
                "userId": str(result.inserted_id),
                "phoneNumber": NEW_CLIENT["phone"],
                "address": NEW_CLIENT["address"]
            })
            print(f"  [OK] Created client: {NEW_CLIENT['email']}")
        
    def create_roles(self):
        """Create roles"""
        print("\n" + "="*60)
        print("STEP 4: Creating roles...")
        print("="*60)
        
        roles = [
            {"id": "ROLE-0001", "code": "super-admin", "name": "Super Admin", "description": "Platform owner"},
            {"id": "ROLE-0002", "code": "admin", "name": "Admin", "description": "Administrative role"},
            {"id": "ROLE-0003", "code": "lawyer", "name": "Lawyer", "description": "Legal practitioner"},
            {"id": "ROLE-0004", "code": "client", "name": "Client", "description": "Client role"},
            {"id": "ROLE-0005", "code": "judge", "name": "Judge", "description": "Court authority"},
        ]
        
        self.roles.insert_many(roles)
        print(f"  [OK] Created {len(roles)} roles")
        
        # User roles
        user_roles = []
        for email, user in self.user_map.items():
            role_code = user.get("role", "client")
            user_roles.append({
                "id": business_id("UR", len(user_roles) + 1),
                "userId": str(user["_id"]),
                "roleId": f"ROLE-{random.randint(3, 4):04d}",
                "isPrimary": True,
                "createdByUserId": str(self.user_map.get("ihmorol@gmail.com", {}).get("_id", ""))
            })
        
        self.user_roles.insert_many(user_roles)
        
    def create_bangladeshi_legal_data(self):
        """Insert authentic Bangladeshi legal references"""
        print("\n" + "="*60)
        print("STEP 5: Creating Bangladeshi legal references...")
        print("="*60)
        
        legal_docs = []
        for i, law in enumerate(BANGLADESHI_LAWS):
            legal_doc = {
                "actName": law["actName"],
                "year": law["year"],
                "number": law["number"],
                "title": law["title"],
                "chapter": law["chapter"],
                "chapterTitle": law["chapterTitle"],
                "previewText": law["previewText"],
                "fullText": law["fullText"],
                "subsections": [],
                "relatedSections": [],
                "isDeleted": False
            }
            legal_docs.append(legal_doc)
        
        self.legals.insert_many(legal_docs)
        print(f"  [OK] Created {len(legal_docs)} Bangladeshi legal references")
        
    def create_cases(self):
        """Create legal cases with Bangladeshi scenarios"""
        print("\n" + "="*60)
        print("STEP 6: Creating legal cases...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        # Combine all scenarios
        all_scenarios = (
            CIVIL_LITIGATION_SCENARIOS + CORPORATE_LAW_SCENARIOS +
            INTELLECTUAL_PROPERTY_SCENARIOS + REAL_ESTATE_SCENARIOS +
            FAMILY_LAW_SCENARIOS + CRIMINAL_DEFENSE_SCENARIOS +
            EMPLOYMENT_LAW_SCENARIOS + TAX_LAW_SCENARIOS
        )
        
        cases = []
        case_status_weights = [0.40, 0.25, 0.15, 0.15, 0.05]
        
        for i in range(20):
            scenario = all_scenarios[i % len(all_scenarios)]
            
            case = {
                "id": business_id("CS", i + 1),
                "caseNumber": f"ADV-2026-{2001 + i}",
                "title": scenario["title"],
                "caseType": scenario["type"],
                "status": pick_weighted(["active", "pending", "review", "closed", "archived"], case_status_weights),
                "urgency": pick_weighted(["low", "medium", "high"], [0.20, 0.50, 0.30]),
                "nextDeadline": random_date(-30, 60),
                "nextDeadlineDescription": f"Submit {scenario['type']} documentation.",
                "progress": random.randint(10, 95),
                "createdBy": lawyer["_id"],
                "clientId": client["_id"],
                "folders": [
                    {"name": "Evidence", "order": 0},
                    {"name": "Witness Statements", "order": 1},
                    {"name": "Legal Documents", "order": 2},
                    {"name": "Correspondence", "order": 3}
                ],
                "isDeleted": False,
                "autoArchiveScheduled": False
            }
            
            cases.append(case)
        
        result = self.cases.insert_many(cases)
        
        for case in cases:
            self.case_map[case["id"]] = case
        
        print(f"  [OK] Created {len(cases)} legal cases")
        
    def create_documents(self):
        """Create documents with Bangladeshi legal context"""
        print("\n" + "="*60)
        print("STEP 7: Creating legal documents...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        
        documents = []
        doc_id = 1
        
        for case_id, case in self.case_map.items():
            num_docs = random.randint(4, 7)
            
            for j in range(num_docs):
                folder = random.choice(list(DOCUMENT_TYPES_BD.keys()))
                doc_type = random.choice(DOCUMENT_TYPES_BD.get(folder, ["Document.pdf"]))
                
                is_analyzed = random.random() < 0.70
                
                doc = {
                    "id": business_id("DOC", doc_id),
                    "caseId": case["_id"],
                    "folderName": folder,
                    "fileName": doc_type,
                    "fileType": "pdf",
                    "fileSize": random.randint(50000, 5000000),
                    "cloudinaryUrl": f"https://res.cloudinary.com/advyon/raw/upload/v2026/{case_id}/{doc_type}",
                    "cloudinaryPublicId": f"advyon/{case_id}/doc-{j+1}",
                    "processingStatus": "completed" if is_analyzed else random.choice(["pending", "processing"]),
                    "analysisStatus": "analyzed" if is_analyzed else "pending",
                    "uploadedBy": lawyer["_id"],
                    "uploaderId": lawyer["_id"],
                    "uploadedAt": random_date(-60, -5),
                    "isDeleted": False
                }
                
                if is_analyzed:
                    # Get relevant legal reference
                    relevant_law = random.choice(BANGLADESHI_LAWS[:10])
                    
                    doc["aiAnalysis"] = {
                        "summary": f"Analysis of {doc_type} for case {case['caseNumber']}. Key legal points identified include provisions under {relevant_law['actName']} Section {relevant_law['number']}.",
                        "rawSummary": f"Extracted text from {doc_type} showing relevant legal content for {case['caseType']} matter.",
                        "keyPoints": [
                            f"Relevant provisions: {relevant_law['actName']} Section {relevant_law['number']}",
                            "Timeline and deadlines identified",
                            "Parties obligations clearly stated",
                            "Legal implications assessed"
                        ],
                        "extractedEntities": ["Plaintiff", "Defendant", case["caseNumber"], relevant_law['actName']],
                        "legalRefs": [
                            {"citation": f"{relevant_law['actName']} Section {relevant_law['number']}", 
                             "description": relevant_law['title'], "relevance": "high"}
                        ],
                        "documentCategory": folder,
                        "confidenceScore": random.uniform(0.75, 0.98),
                        "analyzedAt": random_date(-30, -1),
                        "modelVersion": "advyon-ai-v2"
                    }
                    
                    doc["autoFiling"] = {
                        "status": "moved",
                        "originalFolder": "Inbox",
                        "targetFolder": folder,
                        "confidenceScore": random.uniform(0.75, 0.95),
                        "movedAt": random_date(-25, -2)
                    }
                
                documents.append(doc)
                doc_id += 1
        
        result = self.documents.insert_many(documents)
        
        analyzed = sum(1 for d in documents if d.get("aiAnalysis"))
        print(f"  [OK] Created {len(documents)} documents ({analyzed} with AI analysis)")
        
    def create_messages(self):
        """Create messages"""
        print("\n" + "="*60)
        print("STEP 8: Creating messages...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        message_subjects = [
            "Case Update - Please Review",
            "Document Submission Confirmation",
            "Court Date Notification",
            "Legal Advice Required",
            "Meeting Request",
            "Payment Receipt",
            "Contract Draft for Approval",
            "Client Instructions",
            "Case Strategy Discussion"
        ]
        
        messages = []
        
        for i in range(40):
            is_lawyer = random.random() > 0.4
            
            message = {
                "senderId": lawyer["_id"] if is_lawyer else client["_id"],
                "receiverId": client["_id"] if is_lawyer else lawyer["_id"],
                "caseId": random.choice(list(self.case_map.values()))["_id"],
                "threadId": f"thread-{i//4 + 1}",
                "subject": random.choice(message_subjects),
                "content": f"Message {i+1}: Regarding your case. Please review the attached documents and provide your instructions.",
                "status": pick_weighted(["unread", "read", "replied", "archived"], [0.2, 0.4, 0.3, 0.1]),
                "priority": pick_weighted(["low", "medium", "high"], [0.3, 0.5, 0.2]),
                "attachments": [{"name": f"doc_{i+1}.pdf", "url": f"https://example.com/doc_{i+1}.pdf", "type": "application/pdf"}] if random.random() > 0.6 else [],
                "readAt": random_date(-30, 0) if random.random() > 0.3 else None,
                "isStarred": random.random() > 0.85,
                "createdAt": random_date(-60, -1)
            }
            
            messages.append(message)
        
        self.messages.insert_many(messages)
        print(f"  [OK] Created {len(messages)} messages")
        
    def create_notifications(self):
        """Create notifications"""
        print("\n" + "="*60)
        print("STEP 9: Creating notifications...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        notifications = []
        
        for i in range(40):
            recipient = lawyer if random.random() > 0.4 else client
            
            notification = {
                "type": random.choice(["alert", "request", "message", "case_update", "document_upload", "hearing_reminder", "deadline", "ai_analysis_complete"]),
                "priority": pick_weighted(["low", "medium", "high"], [0.3, 0.5, 0.2]),
                "title": f"Notification {i+1}",
                "message": f"Your attention is required for case-related matter.",
                "recipientId": recipient["_id"],
                "senderId": self.user_map[NEW_CLIENT["email"]]["_id"] if recipient == lawyer else lawyer["_id"],
                "caseId": random.choice(list(self.case_map.values()))["_id"],
                "isRead": random.random() > 0.5,
                "metadata": {"source": "advyon-system"},
                "channels": {"inApp": True, "email": random.random() > 0.6, "webPush": random.random() > 0.7},
                "createdAt": random_date(-45, 0)
            }
            
            notifications.append(notification)
        
        self.notifications.insert_many(notifications)
        print(f"  [OK] Created {len(notifications)} notifications")
        
    def create_schedules(self):
        """Create schedules with Bangladeshi courts"""
        print("\n" + "="*60)
        print("STEP 10: Creating schedules...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        schedules = []
        
        for i in range(30):
            event_type = random.choice(["hearing", "meeting", "filing", "deadline", "other"])
            case = random.choice(list(self.case_map.values()))
            
            schedule = {
                "title": f"{event_type.title()} - {case['caseNumber']}",
                "description": f"Seeded {event_type} for {case['title']}.",
                "eventType": event_type,
                "date": random_date(-5, 45),
                "startTime": f"{random.randint(9, 14):02d}:00",
                "endTime": f"{random.randint(10, 16):02d}:00",
                "location": random.choice(COURT_LOCATIONS),
                "caseId": case["_id"],
                "participants": [lawyer["_id"], client["_id"]],
                "createdBy": lawyer["_id"],
                "status": pick_weighted(["scheduled", "completed", "cancelled", "postponed"], [0.5, 0.3, 0.1, 0.1]),
                "reminders": [{"time": 1440, "sent": random.random() > 0.5}, {"time": 60, "sent": random.random() > 0.7}],
                "recurrence": {"frequency": "weekly", "interval": 1, "endDate": random_date(30, 90), "daysOfWeek": [1, 3, 5]} if random.random() > 0.75 else None,
                "metadata": {"color": random.choice(["#2563eb", "#059669", "#d97706"]), "source": "seed"},
                "createdAt": random_date(-60, -10)
            }
            
            schedules.append(schedule)
        
        self.schedules.insert_many(schedules)
        print(f"  [OK] Created {len(schedules)} schedule events")
        
    def create_activities(self):
        """Create activity logs"""
        print("\n" + "="*60)
        print("STEP 11: Creating activities...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        activities = []
        
        for i in range(80):
            activity = {
                "type": random.choice(["case_created", "case_updated", "document_uploaded", "document_deleted", "system_alert", "user_joined", "document_moved"]),
                "message": f"Activity {i+1}: System logged action.",
                "userId": random.choice([lawyer, client])["_id"],
                "caseId": random.choice(list(self.case_map.values()))["_id"],
                "metadata": {"source": "seed"},
                "createdAt": random_date(-90, 0)
            }
            
            activities.append(activity)
        
        self.activities.insert_many(activities)
        print(f"  [OK] Created {len(activities)} activity records")
        
    def create_subscriptions_and_payments(self):
        """Create subscriptions and payments"""
        print("\n" + "="*60)
        print("STEP 12: Creating subscriptions and payments...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        subscriptions = [
            {
                "user": lawyer["_id"],
                "plan": "professional",
                "status": "active",
                "billingInterval": "month",
                "stripeCustomerId": f"cus_lawyer_{lawyer['id']}",
                "stripeSubscriptionId": f"sub_pro_{lawyer['id']}",
                "stripePriceId": "price_professional",
                "currentPeriodStart": random_date(-25, -15),
                "currentPeriodEnd": random_date(5, 25),
                "cancelAtPeriodEnd": False
            },
            {
                "user": client["_id"],
                "plan": "starter",
                "status": "active",
                "billingInterval": "month",
                "stripeCustomerId": f"cus_client_{client['id']}",
                "stripeSubscriptionId": f"sub_starter_{client['id']}",
                "stripePriceId": "price_starter",
                "currentPeriodStart": random_date(-20, -10),
                "currentPeriodEnd": random_date(10, 20),
                "cancelAtPeriodEnd": False
            }
        ]
        
        self.subscriptions.insert_many(subscriptions)
        
        payments = []
        for i, sub in enumerate(subscriptions):
            for j in range(3):
                payments.append({
                    "user": sub["user"],
                    "amount": 4999 if sub["plan"] == "professional" else 1999,
                    "currency": "usd",
                    "status": "succeeded",
                    "stripePaymentIntentId": f"pi_{i}_{j}",
                    "stripeInvoiceId": f"in_{i}_{j}",
                    "description": f"{sub['plan']} plan payment",
                    "createdAt": random_date(-60 + j*30, -35 + j*30)
                })
        
        self.payments.insert_many(payments)
        print(f"  [OK] Created {len(subscriptions)} subscriptions, {len(payments)} payments")
        
    def create_community_content(self):
        """Create community threads"""
        print("\n" + "="*60)
        print("STEP 13: Creating community content...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        # Use existing lawyer if available, otherwise use new lawyer
        try:
            existing_lawyer = self.user_map["imoral223489@bscse.uiu.ac.bd"]
        except KeyError:
            existing_lawyer = lawyer
        
        thread_titles = [
            "Best practices for handling civil litigation in Bangladesh",
            "Recent amendments to the Companies Act 1994",
            "Trademark registration process with IPO Bangladesh",
            "Tips for bail applications under Section 54 CrPC",
            "Property law procedures in Dhaka courts",
            "Corporate compliance requirements for 2026",
            "Family law mediation process",
            "Labor Court procedures under Labor Act 2006",
            "Tax litigation strategies",
            "Digital Security Act 2018 - Key provisions"
        ]
        
        categories = ["Family Law", "Criminal Defense", "Civil Litigation", "Property Law", "Corporate", "Intellectual Property"]
        
        threads = []
        for i in range(25):
            author = lawyer if random.random() > 0.5 else existing_lawyer
            
            thread = {
                "title": thread_titles[i % len(thread_titles)],
                "content": f"Discussion on legal practice in Bangladesh. Seeking insights from fellow practitioners.",
                "author": author["_id"],
                "category": random.choice(categories),
                "tags": ["bangladesh", "legal", random.choice(["practice", "procedure", "tips"])],
                "views": random.randint(50, 500),
                "upvotes": [lawyer["_id"]],
                "upvotesCount": random.randint(0, 30),
                "repliesCount": 0,
                "isSolved": random.random() > 0.7,
                "isVisible": True,
                "moderation": {
                    "status": pick_weighted(["approved", "review", "pending"], [0.7, 0.2, 0.1]),
                    "confidence": random.uniform(0.65, 0.95),
                    "threshold": 0.72,
                    "toxicityScore": random.uniform(0.01, 0.15),
                    "spamScore": random.uniform(0.01, 0.10),
                    "offTopicScore": random.uniform(0.01, 0.08),
                    "reasons": [],
                    "lastCheckedAt": random_date(-20, -5)
                },
                "createdAt": random_date(-90, -10)
            }
            
            threads.append(thread)
        
        result = self.threads.insert_many(threads)
        
        # Replies
        replies = []
        for thread in threads:
            for j in range(random.randint(3, 6)):
                reply = {
                    "threadId": thread["_id"],
                    "content": f"Reply {j+1}: Great discussion point. In my experience with Bangladesh courts...",
                    "author": lawyer["_id"],
                    "upvotes": [],
                    "isAcceptedAnswer": j == 0,
                    "isVisible": True,
                    "moderation": {
                        "status": "approved",
                        "confidence": random.uniform(0.70, 0.95),
                        "threshold": 0.72,
                        "toxicityScore": 0.02,
                        "spamScore": 0.01,
                        "offTopicScore": 0.01,
                        "reasons": [],
                        "lastCheckedAt": random_date(-15, -3)
                    },
                    "createdAt": random_date(-80, -5)
                }
                
                replies.append(reply)
                
                self.threads.update_one({"_id": thread["_id"]}, {"$inc": {"repliesCount": 1}})
        
        self.replies.insert_many(replies)
        print(f"  [OK] Created {len(threads)} threads, {len(replies)} replies")
        
    def create_personalization(self):
        """Create personalization records"""
        print("\n" + "="*60)
        print("STEP 14: Creating personalization...")
        print("="*60)
        
        for email, user in self.user_map.items():
            personalization = {
                "userId": user["_id"],
                "behaviorLog": [
                    {"eventType": "page_view", "metadata": {"page": "dashboard"}, "timestamp": random_date(-15, -3)},
                    {"eventType": "case_open", "metadata": {}, "timestamp": random_date(-10, -1)}
                ],
                "casePreferences": {
                    "defaultCaseType": random.choice(["Civil Litigation", "Corporate Law"]),
                    "defaultUrgency": "medium",
                    "preferredView": "classic"
                },
                "dashboardWidgets": [
                    {"widgetId": "active-cases", "position": 0, "visible": True, "size": "medium"},
                    {"widgetId": "upcoming-deadlines", "position": 1, "visible": True, "size": "medium"}
                ],
                "notificationPreferences": {
                    "channels": {"inApp": True, "email": True, "webPush": False},
                    "types": {"hearing_reminder": True, "deadline": True, "message": True}
                }
            }
            
            self.personalizations.insert_one(personalization)
        
        print(f"  [OK] Created {len(self.user_map)} personalization records")
        
    def create_ai_data(self):
        """Create AI conversation and tool history"""
        print("\n" + "="*60)
        print("STEP 15: Creating AI data...")
        print("="*60)
        
        lawyer = self.user_map[NEW_LAWYER["email"]]
        client = self.user_map[NEW_CLIENT["email"]]
        
        # AI Contexts
        contexts = []
        for i in range(30):
            user = lawyer if random.random() > 0.3 else client
            case = random.choice(list(self.case_map.values()))
            
            context = {
                "userId": user["id"],
                "caseId": case["id"],
                "messages": [
                    {"role": "user", "content": f"Analyze case {case['caseNumber']}", "createdAt": random_date(-10, -3)},
                    {"role": "assistant", "content": f"Based on analysis of {case['caseNumber']}...", "createdAt": random_date(-8, -1)}
                ],
                "lastUserMessageAt": random_date(-5, -1),
                "lastAssistantMessageAt": random_date(-3, 0)
            }
            contexts.append(context)
        
        self.ai_conversation_contexts.insert_many(contexts)
        
        # AI Profiles
        for user in [lawyer, client]:
            self.ai_personalization_profiles.insert_one({
                "userId": user["id"],
                "preferredTone": "professional",
                "recentKeywords": ["contract", "litigation", "evidence"],
                "recentQueries": ["summarize case", "draft document"],
                "usageCount": random.randint(20, 100),
                "blockedPromptCount": 0,
                "lastSeenAt": random_date(-5, 0)
            })
        
        # AI Tool History
        tool_keys = ["legal_research", "document_analysis", "case_summary", "draft_document", "contract_review"]
        histories = []
        
        for i in range(60):
            user = lawyer if random.random() > 0.3 else client
            case = random.choice(list(self.case_map.values()))
            
            history = {
                "userId": user["id"],
                "toolKey": random.choice(tool_keys),
                "input": f"Analyze legal context for {case['caseNumber']}",
                "output": f"Analysis complete for {case['caseNumber']}. Key recommendations provided.",
                "status": pick_weighted(["success", "blocked", "failed"], [0.85, 0.10, 0.05]),
                "latencyMs": random.randint(350, 3000),
                "model": random.choice(["groq", "gemini", "openrouter"]),
                "metadata": {"caseId": case["id"]},
                "createdAt": random_date(-45, -3)
            }
            histories.append(history)
        
        self.ai_tool_histories.insert_many(histories)
        print(f"  [OK] Created {len(contexts)} AI contexts, {len(histories)} tool histories")
        
    def create_system_data(self):
        """Create system settings and audit logs"""
        print("\n" + "="*60)
        print("STEP 16: Creating system data...")
        print("="*60)
        
        admin = self.user_map.get("ihmorol@gmail.com", list(self.user_map.values())[0])
        
        # System Settings
        self.system_settings.insert_one({
            "siteName": "Advyon - Legal Practice Management Bangladesh",
            "maintenanceMode": False,
            "allowRegistration": True,
            "maxUploadSizeMB": 15,
            "defaultUserRole": "client",
            "sessionTimeoutMinutes": 60,
            "features": {"aiTools": True, "communityHub": True, "billing": True, "notifications": True},
            "updatedBy": str(admin["_id"]),
            "createdAt": random_date(-180, -120),
            "updatedAt": random_date(-30, -10)
        })
        
        # Audit Logs
        audit_logs = []
        for i in range(40):
            log = {
                "action": random.choice(["admin.user.role.update", "admin.case.override", "admin.settings.update"]),
                "actor": admin["_id"],
                "actorEmail": admin["email"],
                "actorRole": "admin",
                "target": NEW_LAWYER["id"],
                "targetType": random.choice(["user", "case", "setting"]),
                "details": {"source": "seed"},
                "ipAddress": f"10.10.0.{random.randint(10, 250)}",
                "userAgent": "Advyon-Web/2.0",
                "createdAt": random_date(-60, -5)
            }
            audit_logs.append(log)
        
        self.audit_logs.insert_many(audit_logs)
        print(f"  [OK] System settings and {len(audit_logs)} audit logs created")
        
    def print_summary(self):
        """Print summary"""
        print("\n" + "="*60)
        print("SEEDING COMPLETE!")
        print("="*60)
        
        collections = {
            "users": self.users,
            "lawyerprofiles": self.lawyerprofiles,
            "clientprofiles": self.clientprofiles,
            "cases": self.cases,
            "documents": self.documents,
            "messages": self.messages,
            "notifications": self.notifications,
            "schedules": self.schedules,
            "activities": self.activities,
            "subscriptions": self.subscriptions,
            "payments": self.payments,
            "threads": self.threads,
            "replies": self.replies,
            "legals": self.legals,
            "personalizations": self.personalizations,
            "aiconversationcontexts": self.ai_conversation_contexts,
            "ai_tool_histories": self.ai_tool_histories,
            "auditlogs": self.audit_logs,
            "systemsettings": self.system_settings
        }
        
        total = 0
        for name, coll in collections.items():
            count = coll.count_documents({})
            total += count
            print(f"  {name}: {count:,}")
        
        print("-"*40)
        print(f"  TOTAL: {total:,}")
        
        print("\n[USER ACCOUNTS]")
        print("\n  --- Existing Users ---")
        for user_data in EXISTING_USERS:
            pwd = user_data.get("password", "N/A")
            print(f"  {user_data['role'].title()}: {user_data['email']} / {pwd}")
        
        print("\n  --- New Users ---")
        print(f"  Lawyer: {NEW_LAWYER['email']} / {NEW_LAWYER['password']}")
        print(f"  Client: {NEW_CLIENT['email']} / {NEW_CLIENT['password']}")
        
        print("\n[OK] Seeding completed successfully!")
        
    def run(self):
        """Execute seeding"""
        print("\n" + "="*60)
        print("ADVYON DATABASE SEEDING")
        print("Bangladeshi Legal Data")
        print("="*60)
        
        try:
            self.clear_data()
            self.get_existing_users()
            self.create_new_users()
            self.create_roles()
            self.create_bangladeshi_legal_data()
            self.create_cases()
            self.create_documents()
            self.create_messages()
            self.create_notifications()
            self.create_schedules()
            self.create_activities()
            self.create_subscriptions_and_payments()
            self.create_community_content()
            self.create_personalization()
            self.create_ai_data()
            self.create_system_data()
            
            self.print_summary()
            
        except Exception as e:
            print(f"\n[ERROR] Error: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            self.client.close()


if __name__ == "__main__":
    seeder = AdvyonSeeder(MONGO_URI, DATABASE_NAME)
    seeder.run()

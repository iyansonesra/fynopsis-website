import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiChevronDown, FiFile, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { get, post } from 'aws-amplify/api';
import useTranslation from './useTranslation';
import { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const Forms = ({ language = 'en' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedFiles, setAnalyzedFiles] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [formFields, setFormFields] = useState({});
  const [embedKey, setEmbedKey] = useState(0); // Add this state for refresh functionality

  const { t } = useTranslation(language);

  const handleRefresh = () => {
    setEmbedKey(prevKey => prevKey + 1); // Increment the key to force refresh
  };


  // Hardcoded response data
  const mockRequiredFieldsResponse = {
    en: {
      empty_fields: {
        "AlienNumber[0]": "Alien Registration Number (A-Number) (if any)",
        "S1_MiddleName[0]": "Middle Name (if applicable)",
        "S2A_AptSteFlrNumber[0]": "Previous Physical Address - Number for Suite, Apartment, or Floor",
        "S2A_CityOrTown[0]": "Previous Physical Address - City or Town",
        "S2A_StreetNumberName[0]": "Previous Physical Address - Street Number and Name",
        "S2A_Unit[0]": "Previous Physical Address - Suite, Apartment, or Floor",
        "S2A_Unit[1]": "Previous Physical Address - Suite, Apartment, or Floor",
        "S2A_Unit[2]": "Previous Physical Address - Suite, Apartment, or Floor",
        "S2A_ZipCode[0]": "Previous Physical Address - ZIP Code",
        "S2B_AptSteFlrNumber[0]": "Present Physical Address - Number for Suite, Apartment, or Floor",
        "S2B_CityOrTown[0]": "Present Physical Address - *City or Town",
        "S2B_StreetNumberName[0]": "Present Physical Address - *Street Number and Name",
        "S2B_ZipCode[0]": "*Present Physical Address - ZIP Code",
        "S2B__Unit[0]": "Present Physical Address - Suite, Apartment, or Floor",
        "S2B__Unit[1]": "Present Physical Address - Suite, Apartment, or Floor",
        "S2B__Unit[2]": "Present Physical Address - Suite, Apartment, or Floor",
        "S2C_AptSteFlrNumber[0]": "Mailing Address (Optional) - Number for Suite, Apartment, or Floor",
        "S2C_CityOrTown[0]": "Mailing Address (Optional) - City or Town",
        "S2C_StreetNumberName[0]": "Mailing Address (Optional) - Street Number and Name",
        "S2C_Unit[0]": "Mailing Address (Optional) - Suite, Apartment, or Floor",
        "S2C_Unit[1]": "Mailing Address (Optional) - Suite, Apartment, or Floor",
        "S2C_Unit[2]": "Mailing Address (Optional) - Suite, Apartment, or Floor",
        "S2C_ZipCode[0]": "Mailing Address (Optional) - ZIP Code",
        "S3_DateofSignature[0]": "*Date of Signature (mm/dd/yyyy)"
      }
    },
    es: {
      empty_fields: {
        "AlienNumber[0]": "Número de Registro de Extranjero (Número A) (si aplica)",
        "S1_MiddleName[0]": "Segundo Nombre (si aplica)",
        "S2A_AptSteFlrNumber[0]": "Dirección Física Anterior - Número de Suite, Apartamento o Piso",
        "S2A_CityOrTown[0]": "Dirección Física Anterior - Ciudad o Pueblo",
        "S2A_StreetNumberName[0]": "Dirección Física Anterior - Número y Nombre de la Calle",
        "S2A_Unit[0]": "Dirección Física Anterior - Suite, Apartamento o Piso",
        "S2A_Unit[1]": "Dirección Física Anterior - Suite, Apartamento o Piso",
        "S2A_Unit[2]": "Dirección Física Anterior - Suite, Apartamento o Piso",
        "S2A_ZipCode[0]": "Dirección Física Anterior - Código Postal",
        "S2B_AptSteFlrNumber[0]": "Dirección Física Actual - Número de Suite, Apartamento o Piso",
        "S2B_CityOrTown[0]": "Dirección Física Actual - *Ciudad o Pueblo",
        "S2B_StreetNumberName[0]": "Dirección Física Actual - *Número y Nombre de la Calle",
        "S2B_ZipCode[0]": "*Dirección Física Actual - Código Postal",
        "S2B__Unit[0]": "Dirección Física Actual - Suite, Apartamento o Piso",
        "S2B__Unit[1]": "Dirección Física Actual - Suite, Apartamento o Piso",
        "S2B__Unit[2]": "Dirección Física Actual - Suite, Apartamento o Piso",
        "S2C_AptSteFlrNumber[0]": "Dirección Postal (Opcional) - Número de Suite, Apartamento o Piso",
        "S2C_CityOrTown[0]": "Dirección Postal (Opcional) - Ciudad o Pueblo",
        "S2C_StreetNumberName[0]": "Dirección Postal (Opcional) - Número y Nombre de la Calle",
        "S2C_Unit[0]": "Dirección Postal (Opcional) - Suite, Apartamento o Piso",
        "S2C_Unit[1]": "Dirección Postal (Opcional) - Suite, Apartamento o Piso",
        "S2C_Unit[2]": "Dirección Postal (Opcional) - Suite, Apartamento o Piso",
        "S2C_ZipCode[0]": "Dirección Postal (Opcional) - Código Postal",
        "S3_DateofSignature[0]": "*Fecha de Firma (mm/dd/aaaa)"
      }
    },
    fr: {
      empty_fields: {
        "AlienNumber[0]": "Numéro d'Enregistrement d'Étranger (Numéro A) (si applicable)",
        "S1_MiddleName[0]": "Deuxième Prénom (si applicable)",
        "S2A_AptSteFlrNumber[0]": "Adresse Physique Précédente - Numéro de Suite, Appartement ou Étage",
        "S2A_CityOrTown[0]": "Adresse Physique Précédente - Ville ou Village",
        "S2A_StreetNumberName[0]": "Adresse Physique Précédente - Numéro et Nom de Rue",
        "S2A_Unit[0]": "Adresse Physique Précédente - Suite, Appartement ou Étage",
        "S2A_Unit[1]": "Adresse Physique Précédente - Suite, Appartement ou Étage",
        "S2A_Unit[2]": "Adresse Physique Précédente - Suite, Appartement ou Étage",
        "S2A_ZipCode[0]": "Adresse Physique Précédente - Code Postal",
        "S2B_AptSteFlrNumber[0]": "Adresse Physique Actuelle - Numéro de Suite, Appartement ou Étage",
        "S2B_CityOrTown[0]": "Adresse Physique Actuelle - *Ville ou Village",
        "S2B_StreetNumberName[0]": "Adresse Physique Actuelle - *Numéro et Nom de Rue",
        "S2B_ZipCode[0]": "*Adresse Physique Actuelle - Code Postal",
        "S2B__Unit[0]": "Adresse Physique Actuelle - Suite, Appartement ou Étage",
        "S2B__Unit[1]": "Adresse Physique Actuelle - Suite, Appartement ou Étage",
        "S2B__Unit[2]": "Adresse Physique Actuelle - Suite, Appartement ou Étage",
        "S2C_AptSteFlrNumber[0]": "Adresse Postale (Facultatif) - Numéro de Suite, Appartement ou Étage",
        "S2C_CityOrTown[0]": "Adresse Postale (Facultatif) - Ville ou Village",
        "S2C_StreetNumberName[0]": "Adresse Postale (Facultatif) - Numéro et Nom de Rue",
        "S2C_Unit[0]": "Adresse Postale (Facultatif) - Suite, Appartement ou Étage",
        "S2C_Unit[1]": "Adresse Postale (Facultatif) - Suite, Appartement ou Étage",
        "S2C_Unit[2]": "Adresse Postale (Facultatif) - Suite, Appartement ou Étage",
        "S2C_ZipCode[0]": "Adresse Postale (Facultatif) - Code Postal",
        "S3_DateofSignature[0]": "*Date de Signature (mm/jj/aaaa)"
      }
    },
    ru: {
      empty_fields: {
        "AlienNumber[0]": "Регистрационный номер иностранца (номер A) (если имеется)",
        "S1_MiddleName[0]": "Отчество (если применимо)",
        "S2A_AptSteFlrNumber[0]": "Предыдущий физический адрес - Номер квартиры, офиса или этажа",
        "S2A_CityOrTown[0]": "Предыдущий физический адрес - Город или населенный пункт",
        "S2A_StreetNumberName[0]": "Предыдущий физический адрес - Номер и название улицы",
        "S2A_Unit[0]": "Предыдущий физический адрес - Квартира, офис или этаж",
        "S2A_Unit[1]": "Предыдущий физический адрес - Квартира, офис или этаж",
        "S2A_Unit[2]": "Предыдущий физический адрес - Квартира, офис или этаж",
        "S2A_ZipCode[0]": "Предыдущий физический адрес - Почтовый индекс",
        "S2B_AptSteFlrNumber[0]": "Текущий физический адрес - Номер квартиры, офиса или этажа",
        "S2B_CityOrTown[0]": "Текущий физический адрес - *Город или населенный пункт",
        "S2B_StreetNumberName[0]": "Текущий физический адрес - *Номер и название улицы",
        "S2B_ZipCode[0]": "*Текущий физический адрес - Почтовый индекс",
        "S2B__Unit[0]": "Текущий физический адрес - Квартира, офис или этаж",
        "S2B__Unit[1]": "Текущий физический адрес - Квартира, офис или этаж",
        "S2B__Unit[2]": "Текущий физический адрес - Квартира, офис или этаж",
        "S2C_AptSteFlrNumber[0]": "Почтовый адрес (Необязательно) - Номер квартиры, офиса или этажа",
        "S2C_CityOrTown[0]": "Почтовый адрес (Необязательно) - Город или населенный пункт",
        "S2C_StreetNumberName[0]": "Почтовый адрес (Необязательно) - Номер и название улицы",
        "S2C_Unit[0]": "Почтовый адрес (Необязательно) - Квартира, офис или этаж",
        "S2C_Unit[1]": "Почтовый адрес (Необязательно) - Квартира, офис или этаж",
        "S2C_Unit[2]": "Почтовый адрес (Необязательно) - Квартира, офис или этаж",
        "S2C_ZipCode[0]": "Почтовый адрес (Необязательно) - Почтовый индекс",
        "S3_DateofSignature[0]": "*Дата подписи (мм/дд/гггг)"
      }
    },
    zh: {
      empty_fields: {
        "AlienNumber[0]": "外国人登记号码（A号码）（如有）",
        "S1_MiddleName[0]": "中间名（如适用）",
        "S2A_AptSteFlrNumber[0]": "前居住地址 - 套房、公寓或楼层号码",
        "S2A_CityOrTown[0]": "前居住地址 - 城市或城镇",
        "S2A_StreetNumberName[0]": "前居住地址 - 街道号码和名称",
        "S2A_Unit[0]": "前居住地址 - 套房、公寓或楼层",
        "S2A_Unit[1]": "前居住地址 - 套房、公寓或楼层",
        "S2A_Unit[2]": "前居住地址 - 套房、公寓或楼层",
        "S2A_ZipCode[0]": "前居住地址 - 邮政编码",
        "S2B_AptSteFlrNumber[0]": "现居住地址 - 套房、公寓或楼层号码",
        "S2B_CityOrTown[0]": "现居住地址 - *城市或城镇",
        "S2B_StreetNumberName[0]": "现居住地址 - *街道号码和名称",
        "S2B_ZipCode[0]": "*现居住地址 - 邮政编码",
        "S2B__Unit[0]": "现居住地址 - 套房、公寓或楼层",
        "S2B__Unit[1]": "现居住地址 - 套房、公寓或楼层",
        "S2B__Unit[2]": "现居住地址 - 套房、公寓或楼层",
        "S2C_AptSteFlrNumber[0]": "邮寄地址（可选） - 套房、公寓或楼层号码",
        "S2C_CityOrTown[0]": "邮寄地址（可选） - 城市或城镇",
        "S2C_StreetNumberName[0]": "邮寄地址（可选） - 街道号码和名称",
        "S2C_Unit[0]": "邮寄地址（可选） - 套房、公寓或楼层",
        "S2C_Unit[1]": "邮寄地址（可选） - 套房、公寓或楼层",
        "S2C_Unit[2]": "邮寄地址（可选） - 套房、公寓或楼层",
        "S2C_ZipCode[0]": "邮寄地址（可选） - 邮政编码",
        "S3_DateofSignature[0]": "*签署日期（月/日/年）"
      }
    },
    ko: {
      empty_fields: {
        "AlienNumber[0]": "외국인 등록번호 (A-번호) (해당되는 경우)",
        "S1_MiddleName[0]": "중간 이름 (해당되는 경우)",
        "S2A_AptSteFlrNumber[0]": "이전 실제 주소 - 스위트, 아파트 또는 층 번호",
        "S2A_CityOrTown[0]": "이전 실제 주소 - 시 또는 마을",
        "S2A_StreetNumberName[0]": "이전 실제 주소 - 거리 번호 및 이름",
        "S2A_Unit[0]": "이전 실제 주소 - 스위트, 아파트 또는 층",
        "S2A_Unit[1]": "이전 실제 주소 - 스위트, 아파트 또는 층",
        "S2A_Unit[2]": "이전 실제 주소 - 스위트, 아파트 또는 층",
        "S2A_ZipCode[0]": "이전 실제 주소 - 우편번호",
        "S2B_AptSteFlrNumber[0]": "현재 실제 주소 - 스위트, 아파트 또는 층 번호",
        "S2B_CityOrTown[0]": "현재 실제 주소 - *시 또는 마을",
        "S2B_StreetNumberName[0]": "현재 실제 주소 - *거리 번호 및 이름",
        "S2B_ZipCode[0]": "*현재 실제 주소 - 우편번호",
        "S2B__Unit[0]": "현재 실제 주소 - 스위트, 아파트 또는 층",
        "S2B__Unit[1]": "현재 실제 주소 - 스위트, 아파트 또는 층",
        "S2B__Unit[2]": "현재 실제 주소 - 스위트, 아파트 또는 층",
        "S2C_AptSteFlrNumber[0]": "우편 주소 (선택사항) - 스위트, 아파트 또는 층 번호",
        "S2C_CityOrTown[0]": "우편 주소 (선택사항) - 시 또는 마을",
        "S2C_StreetNumberName[0]": "우편 주소 (선택사항) - 거리 번호 및 이름",
        "S2C_Unit[0]": "우편 주소 (선택사항) - 스위트, 아파트 또는 층",
        "S2C_Unit[1]": "우편 주소 (선택사항) - 스위트, 아파트 또는 층",
        "S2C_Unit[2]": "우편 주소 (선택사항) - 스위트, 아파트 또는 층",
        "S2C_ZipCode[0]": "우편 주소 (선택사항) - 우편번호",
        "S3_DateofSignature[0]": "*서명 날짜 (월/일/년)"
      }
    },
    pdf_location: "s3://extra-documents-government/ar-11-filled.pdf"
  };

  const translateText = useCallback(async () => {
    try {
      const restOperation = await post({
        apiName: 'LLAMA_API',
        path: '/ai/translate',
        options: {
          headers: { 'Content-Type': 'application/json' },
          body: { query: 'Hello, how are you?', target_language: 'ru' }
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log("Translated text:", response);
      return response.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }, []);

  const getRequiredFields = useCallback(async () => {
    try {
      const restOperation = await post({
        apiName: 'LLAMA_API',
        path: '/ai/map',
        options: {
          headers: { 'Content-Type': 'application/json' },
          body: { source_key: 'ar-11.pdf' }
        }
      });
      // const { body } = await restOperation.response;
      // const responseText = await body.text();
      // const response = JSON.parse(responseText);
      // console.log("Required fields:", response);

      if (mockRequiredFieldsResponse[language]?.empty_fields) {
        const initialFormState = Object.keys(mockRequiredFieldsResponse[language].empty_fields).reduce((acc, key) => {
          acc[key] = '';
          return acc;
        }, {});
        setFormFields({ 
          fields: mockRequiredFieldsResponse[language].empty_fields, 
          values: initialFormState 
        });
      }

      return mockRequiredFieldsResponse[language] || mockRequiredFieldsResponse.en; 
    } catch (error) {
      console.error('Error fetching fields:', error);
      return [];
    }
  }, []);


  // const getRequiredFields = useCallback(async () => {
  //   // Instead of making the API call, return the mock data
  //   try {
  //     // Simulate a brief delay to mimic API latency
  //     await new Promise(resolve => setTimeout(resolve, 500));

  //     if (mockRequiredFieldsResponse.empty_fields) {
  //       const initialFormState = Object.keys(mockRequiredFieldsResponse.empty_fields).reduce((acc, key) => {
  //         acc[key] = '';
  //         return acc;
  //       }, {});
  //       setFormFields({ fields: mockRequiredFieldsResponse.empty_fields, values: initialFormState });
  //     }

  //     return mockRequiredFieldsResponse;
  //   } catch (error) {
  //     console.error('Error fetching fields:', error);
  //     return [];
  //   }
  // }, []);

  const fillRequiredFields = useCallback(async (fieldValues) => {
    console.log('Filling fields:', fieldValues);
    try {
      const restOperation = await post({
        apiName: 'LLAMA_API',
        path: '/ai/fill',
        options: {
          headers: { 'Content-Type': 'application/json' },
          body: { source_key: 'ar-11-filled.pdf', field_values: fieldValues }
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log("Form filled:", response);
      return response.files || [];
    } catch (error) {
      console.error('Error filling fields:', error);
      return [];
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      const restOperation = await get({
        apiName: 'LLAMA_API',
        path: '/data/list',
        options: {
          headers: { 'Content-Type': 'application/json' },
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  };

  const simulateFileAnalysis = async (files) => {
    for (let i = 0; i < files.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAnalyzedFiles(prev => [...prev, files[i]]);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    setAnalysisComplete(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
  };

  const handleFormSelect = async (formType) => {
    setSelectedForm(formType);
    setShowDropdown(false);
    setIsAnalyzing(true);
    setAnalyzedFiles([]);
    setAnalysisComplete(false);

    translateText();
    await getRequiredFields();

    const files = await fetchDocuments();
    await simulateFileAnalysis(files);
  };

  const handleInputChange = (fieldName, value) => {
    setFormFields(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [fieldName]: value
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting form:', formFields);
      await fillRequiredFields(formFields.values);
      // You could add success handling here
    } catch (error) {
      console.error('Error submitting form:', error);
      // You could add error handling here
    }
  };

  const formatLabel = (fieldName) => {
    // Remove array notation
    const withoutBrackets = fieldName.replace(/\[\d+\]/, '');
    // Split on underscores and remove section prefixes
    const parts = withoutBrackets.split('_').filter(part => !part.match(/^[A-Z]\d[A-Z]?$/));
    // Join with spaces and capitalize first letter
    return parts
      .join(' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, str => str.toUpperCase());
  };

  if (selectedForm && isAnalyzing) {
    return (
      <div className="min-h-screen p-4 text-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl text-black font-bold">{t('analyzingDocuments')}</h1>
          <button
            onClick={() => {
              setSelectedForm(null);
              setIsAnalyzing(false);
              setAnalyzedFiles([]);
              setAnalysisComplete(false);
            }}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-2xl mx-auto mt-12">
          <div className="space-y-4">
            {analyzedFiles.map((file, index) => (
              <motion.div
                key={file.fileName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-900 p-4 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <FiFile className="text-black" />
                  <span className="text-black">{file.fileName}</span>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <FiCheck className="text-green-400 w-5 h-5" />
                </motion.div>
              </motion.div>
            ))}
          </div>

          {analysisComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-8 text-green-400"
            >
              {t('analysisComplete')}
            </motion.div>
          )}

          {!analysisComplete && analyzedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-8 text-purple-400"
            >
              {t('analyzingDocuments')}
            </motion.div>
          )}
        </div>
      </div>
    );
  }


  if (selectedForm) {
    return (
      <div className="min-h-screen p-4 text-white">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl text-black font-bold">{t('formAssistant')}</h1>
            <button
              onClick={handleRefresh}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-purple-900/20"
              title="Refresh Form"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setSelectedForm(null)}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-8rem)] mb-4">
          <ScrollArea className="bg-slate-100  rounded-lg flex flex-col">
            <div className="p-4 flex-1 flex flex-col">
              <ScrollArea className="flex-1 -mr-4 pr-4">
                {formFields.fields && Object.entries(formFields.fields).map(([fieldName, description]) => (
                  <div key={fieldName} className="space-y-2">
                    <label className="block text-sm font-medium text-black">
                      {formatLabel(fieldName)}
                      <span className="text-xs text-gray-400 ml-2">
                        ({description})
                      </span>
                    </label>
                    <input
                      type={fieldName.includes('Date') ? 'date' : 'text'}
                      value={formFields.values[fieldName] || ''}
                      onChange={(e) => handleInputChange(fieldName, e.target.value)}
                      className="w-full  border border-slate-900 rounded-lg px-4 py-2 
                               text-black placeholder-gray-400 focus:outline-none 
                               focus:ring-2 focus:ring-purple-500"
                      placeholder={formatLabel(fieldName)}
                    />
                  </div>
                ))}
              </ScrollArea>

              <div className="mt-4 pt-4 border-t border-purple-600">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white 
                         px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Submit Form
                </button>
              </div>
            </div>
          </ScrollArea>

          <div className="bg-purple-900/20 rounded-lg pb-4">
            <embed
              key={embedKey} // Add key prop to force refresh
              src="https://extra-documents-government.s3.us-east-1.amazonaws.com/ar-11-filled.pdf"
              type="application/pdf"
              className="w-full h-full rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen p-4 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">{t('forms')}</h1>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-950
                     text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>{t('newForm')}</span>
            <FiChevronDown className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-slate-900 rounded-lg 
                         shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => handleFormSelect('AR-11')}
                  className="w-full text-left px-4 py-2 text-white hover:bg-slate-950
                           transition-colors"
                >
                  AR-11
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center py-8">
        <p className="text-gray-400">{t('noForms')}</p>
      </div>
    </div>
  );
};

export default Forms;
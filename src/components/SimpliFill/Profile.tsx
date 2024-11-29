import React, { useEffect, useState, useCallback } from 'react';
import { FiSave } from 'react-icons/fi';
import { get, post } from 'aws-amplify/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import useTranslation from './useTranslation';

const Profile = ({ language = 'en' }) => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    ssn: '',
    gender: '',
    phoneNumber: '',
    emailAddress: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    county: '',
    state: '',
    zipCode: '',
    country: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isFormModified, setIsFormModified] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { t } = useTranslation(language);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({
      ...prevProfile,
      [name]: value
    }));
    setIsFormModified(true);
  };

  const handleItemList = useCallback(async () => {
    try {
      const restOperation = await get({
        apiName: 'LLAMA_API',
        path: '/item/get',
        options: {
          headers: { 'Content-Type': 'application/json' },
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response;
    } catch (error) {
      console.error('Error fetching files:', error);
      return null;
    }
  }, []);

  const handlePutItem = useCallback(async (e) => {
    e.preventDefault();
    try {
      console.log(profile);
      const restOperation = await post({
        apiName: 'LLAMA_API',
        path: '/item/put',
        options: {
          headers: { 'Content-Type': 'application/json' },
          body: profile,
        },
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      setIsFormModified(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide message after 3 seconds


      return response;
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }, [profile]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const fetchedProfile = await handleItemList();
        if (fetchedProfile) {
          setProfile(fetchedProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [handleItemList]);

  if (isLoading) {
    return <div className="min-h-screen p-4 text-white">{t('loading')}</div>;
  }

  if (!profile) {
    return <div className="min-h-screen p-4 text-white">Failed to load profile data.</div>;
  }

  return (
    <ScrollArea className="h-screen">

      <div className="min-h-screen p-4 text-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">{t('yourProfile')}</h1>
        </div>

        <form onSubmit={handlePutItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Input label={t('firstName')} name="firstName" value={profile.firstName} onChange={handleChange} />
            <Input label={t('lastName')} name="lastName" value={profile.lastName} onChange={handleChange} />
            <Input label={t('middleName')} name="middleName" value={profile.middleName} onChange={handleChange} />
            <Input label={t('dateOfBirth')} name="dateOfBirth" type="date" value={profile.dateOfBirth} onChange={handleChange} />
            <Input label={t('ssn')} name="ssn" value={profile.ssn} onChange={handleChange} />
            <Input label={t('gender')} name="gender" value={profile.gender} onChange={handleChange} />
            <Input label={t('phoneNumber')} name="phoneNumber" value={profile.phoneNumber} onChange={handleChange} />
            <Input label={t('emailAddress')} name="email" type="email" value={profile.email} onChange={handleChange} />
          </div>
          <div className="space-y-4">
            <Input label={t('streetAddress')} name="streetAddress" value={profile.streetAddress} onChange={handleChange} />
            <Input label={t('streetAddress2')} name="streetAddress2" value={profile.streetAddress2} onChange={handleChange} />
            <Input label={t('city')} name="city" value={profile.city} onChange={handleChange} />
            <Input label={t('county')} name="county" value={profile.county} onChange={handleChange} />
            <Input label={t('state')} name="state" value={profile.state} onChange={handleChange} />
            <Input label={t('zipCode')} name="zipCode" value={profile.zipCode} onChange={handleChange} />
            <Input label={t('country')} name="country" value={profile.country} onChange={handleChange} />
          </div>
          <div className="mt-6 flex-row flex items-center">
            <button
              type="submit"
              disabled={!isFormModified}
              className={`flex items-center space-x-2 mb-16 ${isFormModified
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-400 cursor-not-allowed'
                } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              <FiSave className="w-5 h-5" />
              <span>{t('saveChanges')}</span>
            </button>
            {showSuccessMessage && (
              <span className="ml-4 text-green-500 font-medium">Changes successfully saved!</span>
            )}
          </div>
        </form>
      </div>
    </ScrollArea>
  );
};

const Input = ({ label, name, type = 'text', value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      className="w-full   border border-slate-600 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  </div>
);

export default Profile;